/** Thrown by `OcrEngine` jobs that were cancelled by the user (not a failure to report). */
export class OcrCancelledError extends Error {
  constructor() {
    super('OCR cancelled');
    this.name = 'OcrCancelledError';
  }
}

export type BackupErrorCode = 'not_json' | 'not_a_backup' | 'unsupported_version' | 'incomplete' | 'invalid_data';

/** Thrown when a backup file cannot be used; the UI maps the code to a message. */
export class BackupError extends Error {
  constructor(public readonly code: BackupErrorCode) {
    super(`Invalid backup: ${code}`);
    this.name = 'BackupError';
  }
}
