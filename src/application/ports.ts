import type { Allergy } from '../domain/allergy';
import type { AllergyAnalysisItem, AllergyAnalysisRequest } from '../domain/allergyAnalysis';
import type { DoseLog } from '../domain/dose';
import type { Medication } from '../domain/medication';
import type { PrescriptionPhoto } from '../domain/photo';
import type { Settings } from '../domain/settings';
import type { EpochMs } from '../domain/time';

/*
 * Ports: what the application layer needs from the outside world.
 * They are implemented by `src/infrastructure` and wired in `src/composition-root.ts`.
 * In every `update` patch, properties set to `undefined` are removed from the stored record.
 */

export interface MedicationRepository {
  list(): Promise<Medication[]>;
  findById(id: string): Promise<Medication | undefined>;
  addMany(medications: Medication[]): Promise<void>;
  update(id: string, patch: Partial<Medication>): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

export interface DoseRepository {
  listAll(): Promise<DoseLog[]>;
  /** Doses scheduled inside `[from, to]` (both bounds inclusive). */
  listBetween(from: EpochMs, to: EpochMs): Promise<DoseLog[]>;
  /** Ascending by `scheduledAt`. */
  listByMedication(medicationId: string): Promise<DoseLog[]>;
  /** Doses that are pending or snoozed. */
  listOpen(): Promise<DoseLog[]>;
  addMany(doses: DoseLog[]): Promise<void>;
  update(id: string, patch: Partial<DoseLog>): Promise<void>;
  removeMany(ids: string[]): Promise<void>;
  removeByMedication(medicationId: string): Promise<void>;
  clear(): Promise<void>;
}

export interface SettingsRepository {
  /** `undefined` until the user saves something. */
  get(): Promise<Settings | undefined>;
  save(settings: Settings): Promise<void>;
  clear(): Promise<void>;
}

export interface PhotoRepository {
  listAll(): Promise<PrescriptionPhoto[]>;
  findById(id: string): Promise<PrescriptionPhoto | undefined>;
  add(photo: PrescriptionPhoto): Promise<void>;
  addMany(photos: PrescriptionPhoto[]): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

export interface AllergyRepository {
  listAll(): Promise<Allergy[]>;
  add(allergy: Allergy): Promise<void>;
  addMany(allergies: Allergy[]): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

/** Runs several repository calls atomically: all of them are applied or none is. */
export interface TransactionRunner {
  run<T>(work: () => Promise<T>): Promise<T>;
}

export interface IdGenerator {
  next(): string;
}

export interface OcrProgress {
  stage: 'preparing' | 'reading';
  /** 0..100 */
  percent: number;
}

export interface OcrJob {
  /** Resolves with the recognized text; rejects with `OcrCancelledError` when cancelled. */
  result: Promise<string>;
  cancel(): Promise<void>;
}

/** Reads text from a prescription photo, entirely on the device. */
export interface OcrEngine {
  /**
   * @param images - variants of the same photo (same size and position), best first;
   *   the engine may skip the others when the first one reads well
   */
  recognize(images: Blob[], onProgress: (progress: OcrProgress) => void): OcrJob;
}

export interface PreparedImage {
  /** Cleaned-up variants of the photo sent to the OCR (straightened, shadows removed), best first. */
  ocrBlobs: Blob[];
  /** Smaller color photo shown during the review. */
  previewDataUrl: string;
}

export interface ImageProcessor {
  prepareForOcr(file: Blob): Promise<PreparedImage>;
  /** Small compressed JPEG, kept only if the user asks to store the prescription photo. */
  createThumbnail(dataUrl: string): Promise<string>;
}

export interface PdfReportRequest {
  medications: Medication[];
  doses: DoseLog[];
  /** `yyyy-MM-dd` */
  from: string;
  /** `yyyy-MM-dd` */
  to: string;
  includeDoses: boolean;
  generatedAt?: Date;
}

export interface GeneratedPdf {
  pageCount: number;
  save(fileName: string): void;
  toBlob(): Blob;
}

export interface PdfReportGenerator {
  generate(request: PdfReportRequest): Promise<GeneratedPdf>;
}

/** Hands the user a calendar file with reminders for the medication. */
export interface CalendarExporter {
  download(medication: Medication): void;
}

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export interface ReminderNotifier {
  isSupported(): boolean;
  getPermission(): NotificationPermissionState;
  /** Must be called from a user gesture, after explaining the reason. */
  requestPermission(): Promise<NotificationPermissionState>;
  /** Returns whether a notification was actually shown. */
  showDoseReminder(dose: DoseLog, medication: Medication): Promise<boolean>;
  /** Shows how many doses are due now (tab title and app icon badge), like a chat app; 0 clears it. Fails silently. */
  showPendingCount(count: number): void;
  /** Closes the notification of a dose that was already registered; fails silently. */
  dismissDoseReminder(doseId: string): Promise<void>;
  /** Short beep and vibration while the app is open; fails silently. */
  playAlert(): void;
}

/** Asks an external service which active ingredients a medication has and whether they match the allergies. Rejects on any failure. */
export interface AllergyAnalyzer {
  analyze(request: AllergyAnalysisRequest): Promise<AllergyAnalysisItem[]>;
}

export interface FileDownloader {
  download(blob: Blob, fileName: string): void;
}

export interface StoragePorts {
  transactions: TransactionRunner;
  ids: IdGenerator;
  medications: MedicationRepository;
  doses: DoseRepository;
  settings: SettingsRepository;
  photos: PhotoRepository;
  allergies: AllergyRepository;
}

export interface DevicePorts {
  ocr: OcrEngine;
  imaging: ImageProcessor;
  pdf: PdfReportGenerator;
  calendar: CalendarExporter;
  notifier: ReminderNotifier;
  files: FileDownloader;
  /** `null` when no analysis service is configured: the app then only uses the local check. */
  allergyAnalyzer: AllergyAnalyzer | null;
}

export type ApplicationPorts = StoragePorts & DevicePorts;
