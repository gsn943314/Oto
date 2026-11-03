import OpenAI from 'openai';
import * as OpenCC from 'opencc-js';
import { normalizeLanguageCode } from '../shared/languages.js';
import { ErrorType } from '../shared/types.js';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export const TRANSCRIPTION_MODEL = 'gpt-transcribe';
const REQUEST_TIMEOUT_MS = 60_000;

// Preserve Traditional Chinese with Taiwan wording, including mixed-language transcripts.
const toTraditional = OpenCC.Converter({ from: 'cn', to: 'twp' });

export interface TranscriptionResult {
  text: string;
  language?: string; // ISO-639-1 code of the language heard
}
const MAX_ATTEMPTS = 3;

export interface TranscriptionClientConfig {
  apiKey: string;
}

export interface TranscriptionOptions {
  language?: string;
  prompt?: string;
}

export class TranscriptionClient {
  private client: OpenAI | null = null;
  private config: TranscriptionClientConfig;

  constructor(config: TranscriptionClientConfig) {
    this.config = config;
    if (config.apiKey) {
      this.initializeClient();
    }
  }

  private initializeClient(): void {
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      // A short clip comes back in a few seconds; past a minute something is wrong, so say so instead of
      // leaving the window on "Processing" (the SDK's default is 10 minutes, retried twice).
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: 0, // retries are decided below, per kind of error
    });
  }

  /**
   * Update the API key and reinitialize the client
   */
  updateApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    this.initializeClient();
  }

  /**
   * Validate the API key by making a test request
   */
  async validateApiKey(): Promise<boolean> {
    if (!this.config.apiKey) {
      return false;
    }

    try {
      // Make a simple API call to validate the key
      // We'll use the models list endpoint as it's lightweight
      if (!this.client) {
        this.initializeClient();
      }

      await this.client!.models.list();
      return true;
    } catch (error: any) {
      // Check if it's an authentication error
      if (error?.status === 401 || error?.code === 'invalid_api_key') {
        return false;
      }
      // For other errors, we'll assume the key might be valid but there's another issue
      console.error('API key validation error:', error);
      return false;
    }
  }

  /**
   * Transcribe audio file to text using OpenAI GPT-Transcribe.
   * Only failures that can pass on their own (dropped connection, a busy server, a real rate limit) are retried;
   * a bad key or an empty balance fails at once with its own error type.
   */
  async transcribe(
    audioBuffer: Buffer,
    options?: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    if (!this.client) {
      throw this.createError(ErrorType.API_KEY_INVALID, 'API key not configured. Please set your OpenAI API key in settings.');
    }

    const tempFilePath = path.join(app.getPath('temp'), `audio-${Date.now()}.webm`);
    fs.writeFileSync(tempFilePath, audioBuffer);

    try {
      for (let attempt = 1; ; attempt++) {
        try {
          // GPT-Transcribe uses plural language hints and JSON language predictions.
          // Keep the request as a variable so SDK versions predating `languages` still send it unchanged.
          const language = options?.language && options.language !== 'auto' ? options.language : undefined;
          const request = {
            file: fs.createReadStream(tempFilePath),
            model: TRANSCRIPTION_MODEL,
            response_format: 'json' as const,
            ...(language ? { languages: [language === 'zh' ? 'zh-tw' : language] } : {}),
            ...(options?.prompt ? { prompt: options.prompt } : {}),
          };
          const response = await this.client.audio.transcriptions.create(request);
          const predictions = (response as typeof response & { languages?: { code?: string }[] }).languages;
          const detected = (Array.isArray(predictions) ? predictions : [])
            .map(item => normalizeLanguageCode(item?.code)).filter((code): code is string => !!code);
          const heard = detected[0] ?? normalizeLanguageCode(language);
          const text = response.text.trim();
          const chinese = detected.includes('zh') || (!detected.length && language === 'zh');
          return { text: chinese ? toTraditional(text) : text, language: heard };
        } catch (error: any) {
          const failure = this.classify(error);
          if (failure.retry && attempt < MAX_ATTEMPTS) {
            console.log(`${failure.type}, retrying (${attempt}/${MAX_ATTEMPTS - 1})...`);
            await this.delay(1000 * attempt);
            continue;
          }
          throw this.createError(failure.type, failure.message, {
            status: error?.status,
            code: error?.code,
            message: error?.message,
          });
        }
      }
    } finally {
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    }
  }

  /** What went wrong, in the app's terms, and whether trying again could help */
  private classify(error: any): { type: ErrorType; message: string; retry: boolean } {
    const status: number | undefined = error?.status;
    const code: string | undefined = error?.code ?? error?.error?.code;

    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      return { type: ErrorType.TIMEOUT, message: `OpenAI did not answer within ${REQUEST_TIMEOUT_MS / 1000} seconds.`, retry: false };
    }
    if (error instanceof OpenAI.APIConnectionError || ['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'].includes(code ?? '')) {
      return { type: ErrorType.NETWORK_ERROR, message: 'Could not reach OpenAI. Check your internet connection.', retry: true };
    }
    if (status === 401 || code === 'invalid_api_key') {
      return { type: ErrorType.API_KEY_INVALID, message: 'OpenAI rejected the API key.', retry: false };
    }
    // 429 means two different things: the balance is empty (no point retrying) or too many requests at once
    if (code === 'insufficient_quota' || code === 'billing_hard_limit_reached' || /quota|billing/i.test(error?.message ?? '')) {
      return { type: ErrorType.INSUFFICIENT_QUOTA, message: 'Your OpenAI credit balance has run out.', retry: false };
    }
    if (status === 429) {
      return { type: ErrorType.RATE_LIMITED, message: 'OpenAI is limiting requests right now.', retry: true };
    }
    if (status !== undefined && status >= 500) {
      return { type: ErrorType.API_REQUEST_FAILED, message: `OpenAI had a server error (${status}).`, retry: true };
    }
    return { type: ErrorType.API_REQUEST_FAILED, message: error?.message || 'Transcription failed.', retry: false };
  }

  /**
   * Create a standardized error object
   */
  private createError(type: ErrorType, message: string, details?: any): Error {
    const error = new Error(message) as Error & { type: ErrorType; details?: any };
    error.type = type;
    error.details = details;
    return error;
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
