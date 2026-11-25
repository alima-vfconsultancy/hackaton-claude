import { createBackupService, type BackupService } from './backup';
import { createDoseService, type DoseService } from './doseService';
import { createMedicationService, type MedicationService } from './medicationService';
import type { ApplicationPorts, CalendarExporter, FileDownloader, ImageProcessor, OcrEngine, ReminderNotifier } from './ports';
import { createReminderService, type ReminderService } from './reminderService';
import { createReportService, type ReportService } from './reportService';
import { createSampleDataService, type SampleDataService } from './sampleData';
import { createSettingsService, type SettingsService } from './settingsService';
import { createSyncDoses, type SyncDoses } from './syncDoses';

/** Everything the presentation layer can ask the application to do. */
export interface Application {
  medications: MedicationService;
  doses: DoseService;
  /** Creates pending doses, finishes expired treatments and marks overdue doses as missed. */
  syncDoses: SyncDoses;
  reminders: ReminderService;
  settings: SettingsService;
  backup: BackupService;
  reports: ReportService;
  sampleData: SampleDataService;
  /** Device capabilities, exposed as they are. */
  ocr: OcrEngine;
  imaging: ImageProcessor;
  calendar: CalendarExporter;
  notifier: ReminderNotifier;
  files: FileDownloader;
}

/** Wires the use cases to the given ports (storage and device adapters). */
export function createApplication(ports: ApplicationPorts): Application {
  const syncDoses = createSyncDoses(ports);
  const medications = createMedicationService(ports, syncDoses);
  return {
    medications,
    doses: createDoseService(ports, syncDoses),
    syncDoses,
    reminders: createReminderService(ports, ports.notifier, syncDoses),
    settings: createSettingsService(ports.settings),
    backup: createBackupService(ports),
    reports: createReportService(ports, ports.pdf),
    sampleData: createSampleDataService(medications),
    ocr: ports.ocr,
    imaging: ports.imaging,
    calendar: ports.calendar,
    notifier: ports.notifier,
    files: ports.files,
  };
}
