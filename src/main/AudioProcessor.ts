import { ErrorType } from '../shared/types.js';

export class AudioProcessor {
  // Maximum audio file size: 25MB (transcription API limit is 25MB)
  private static readonly MAX_FILE_SIZE = 25 * 1024 * 1024;

  /**
   * Convert audio Blob data (as array) to Buffer with memory optimization
   */
  static blobToBuffer(blobData: number[] | Uint8Array): Buffer {
    try {
      let buffer: Buffer;
      
      if (Array.isArray(blobData)) {
        // Use Buffer.from for better memory efficiency
        buffer = Buffer.from(blobData);
      } else if (blobData instanceof Uint8Array) {
        // Reuse the underlying ArrayBuffer when possible
        buffer = Buffer.from(blobData.buffer, blobData.byteOffset, blobData.byteLength);
      } else {
        throw new Error('Invalid blob data format');
      }
      
      return buffer;
    } catch (error) {
      throw this.createError(
        ErrorType.AUDIO_RECORDING_FAILED,
        'Failed to convert audio data to buffer',
        error
      );
    }
  }

  /**
   * Check if audio file size is within acceptable limits
   */
  static validateAudioSize(buffer: Buffer): void {
    const sizeInBytes = buffer.length;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    if (sizeInBytes === 0) {
      throw this.createError(
        ErrorType.AUDIO_RECORDING_FAILED,
        'Audio file is empty',
        { size: sizeInBytes }
      );
    }

    if (sizeInBytes > this.MAX_FILE_SIZE) {
      throw this.createError(
        ErrorType.AUDIO_RECORDING_FAILED,
        `Audio file is too large (${sizeInMB.toFixed(2)}MB). Maximum size is 25MB.`,
        { size: sizeInBytes, maxSize: this.MAX_FILE_SIZE }
      );
    }
  }

  /**
   * Process audio data: convert to buffer and validate
   * Returns buffer and provides cleanup function
   */
  static processAudioData(blobData: number[] | Uint8Array): { buffer: Buffer; cleanup: () => void } {
    // Convert to buffer
    const buffer = this.blobToBuffer(blobData);

    // Validate size
    this.validateAudioSize(buffer);

    // Provide cleanup function to help with garbage collection
    const cleanup = () => {
      // Clear any references to help GC
      // In Node.js, buffers are automatically garbage collected,
      // but we can hint that we're done with this data
      if (buffer && typeof (buffer as any).fill === 'function') {
        // Zero out the buffer to help with memory cleanup
        (buffer as any).fill(0);
      }
    };

    return { buffer, cleanup };
  }

  /**
   * Get audio file size in human-readable format
   */
  static getAudioSizeInfo(buffer: Buffer): string {
    const sizeInBytes = buffer.length;
    const sizeInKB = sizeInBytes / 1024;
    const sizeInMB = sizeInBytes / (1024 * 1024);

    if (sizeInMB >= 1) {
      return `${sizeInMB.toFixed(2)} MB`;
    } else if (sizeInKB >= 1) {
      return `${sizeInKB.toFixed(2)} KB`;
    } else {
      return `${sizeInBytes} bytes`;
    }
  }

  /**
   * Create a standardized error object
   */
  private static createError(type: ErrorType, message: string, details?: any): Error {
    const error = new Error(message) as Error & { type: ErrorType; details?: any };
    error.type = type;
    error.details = details;
    return error;
  }
}
