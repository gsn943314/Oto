import { ErrorType, AppError } from '../../shared/types';

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private recording: boolean = false;
  private cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Request microphone permission and start recording
   */
  async startRecording(): Promise<void> {
    if (this.recording) {
      throw this.createError(
        ErrorType.AUDIO_RECORDING_FAILED,
        'Recording is already in progress'
      );
    }

    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });

      // Create MediaRecorder instance
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
      });

      // Reset audio chunks
      this.audioChunks = [];

      // Handle data available event
      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Handle recording errors
      this.mediaRecorder.onerror = (event: Event) => {
        console.error('MediaRecorder error:', event);
        this.cleanup();
        throw this.createError(
          ErrorType.AUDIO_RECORDING_FAILED,
          'Recording failed due to MediaRecorder error'
        );
      };

      // Start recording
      this.mediaRecorder.start();
      this.recording = true;

    } catch (error: any) {
      this.cleanup();
      
      // Handle permission denied
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw this.createError(
          ErrorType.MICROPHONE_ACCESS_DENIED,
          'Microphone access was denied. Please grant permission in system settings.',
          error
        );
      }
      
      // Handle device not found
      if (error.name === 'NotFoundError') {
        throw this.createError(
          ErrorType.AUDIO_RECORDING_FAILED,
          'No microphone device found',
          error
        );
      }

      // Handle other errors
      throw this.createError(
        ErrorType.AUDIO_RECORDING_FAILED,
        error.message || 'Failed to start recording',
        error
      );
    }
  }

  /**
   * Stop recording and return the audio blob
   */
  async stopRecording(): Promise<Blob> {
    if (!this.recording || !this.mediaRecorder) {
      throw this.createError(
        ErrorType.AUDIO_RECORDING_FAILED,
        'No recording in progress'
      );
    }

    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(this.createError(
          ErrorType.AUDIO_RECORDING_FAILED,
          'MediaRecorder is not initialized'
        ));
        return;
      }

      // Handle stop event
      this.mediaRecorder.onstop = () => {
        try {
          const audioBlob = this.getAudioBlob();
          this.cleanup();
          resolve(audioBlob);
        } catch (error) {
          this.cleanup();
          reject(error);
        }
      };

      // Stop the recorder
      this.mediaRecorder.stop();
      this.recording = false;
    });
  }

  /** The live microphone stream while recording (the record button reads its level) */
  getStream(): MediaStream | null {
    return this.stream;
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.recording;
  }

  /**
   * Get the audio blob from recorded chunks
   */
  getAudioBlob(): Blob {
    if (this.audioChunks.length === 0) {
      throw this.createError(
        ErrorType.AUDIO_RECORDING_FAILED,
        'No audio data recorded'
      );
    }

    const mimeType = this.getSupportedMimeType();
    return new Blob(this.audioChunks, { type: mimeType });
  }

  /**
   * Get supported MIME type for recording
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    // Fallback to default
    return 'audio/webm';
  }

  /**
   * Clean up resources immediately and schedule delayed cleanup
   */
  private cleanup(): void {
    // Clear any existing cleanup timer
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // Stop all media tracks immediately
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
        // Remove event listeners to help GC
        track.onended = null;
      });
      this.stream = null;
    }
    
    // Clear MediaRecorder
    if (this.mediaRecorder) {
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onerror = null;
      this.mediaRecorder.onstop = null;
      this.mediaRecorder = null;
    }
    
    // Clear audio chunks array
    this.audioChunks = [];
    this.recording = false;

    // Schedule a delayed cleanup to help with garbage collection
    this.cleanupTimer = setTimeout(() => {
      // Force a hint to the garbage collector by nullifying references
      this.audioChunks = [];
      this.cleanupTimer = null;
    }, 1000);
  }

  /**
   * Manually dispose of the recorder and all resources
   * Call this when the component unmounts
   */
  dispose(): void {
    this.cleanup();
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Create an AppError object
   */
  private createError(type: ErrorType, message: string, details?: any): AppError {
    return {
      type,
      message,
      details,
    };
  }
}
