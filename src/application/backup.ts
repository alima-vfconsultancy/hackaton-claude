import type { DoseLog } from '../domain/dose';
import type { Medication } from '../domain/medication';
import type { PrescriptionPhoto } from '../domain/photo';
import type { Settings } from '../domain/settings';
import { BackupError } from './errors';
import type { StoragePorts } from './ports';

export const BACKUP_APP_ID = 'meu-remedio';
/** Bumped whenever the shape of the stored data changes. */
export const BACKUP_VERSION = 2;

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  version: typeof BACKUP_VERSION;
  /** ISO 8601 instant. */
  exportedAt: string;
  medications: Medication[];
  doseLogs: DoseLog[];
  photos: PrescriptionPhoto[];
  settings: Settings | null;
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const MEDICATION_STATUSES = ['active', 'paused', 'finished'];
const DOSE_STATUSES = ['pending', 'taken', 'skipped', 'missed', 'snoozed'];

function isMedicationShape(value: unknown): boolean {
  if (!isObject(value) || typeof value.id !== 'string' || typeof value.name !== 'string') return false;
  if (!MEDICATION_STATUSES.includes(value.status as string) || typeof value.form !== 'string') return false;
  if (typeof value.dosesTrackedFrom !== 'number') return false;
  const { period, schedule } = value;
  if (!isObject(period) || typeof period.startDate !== 'string') return false;
  if (period.endDate !== undefined && typeof period.endDate !== 'string') return false;
  if (!isObject(schedule)) return false;
  if (schedule.type === 'interval') return typeof schedule.intervalHours === 'number';
  return schedule.type === 'fixedTimes' && Array.isArray(schedule.times);
}

const isDoseShape = (value: unknown): boolean =>
  isObject(value) && typeof value.id === 'string' && typeof value.medicationId === 'string' && typeof value.scheduledAt === 'number'
  && DOSE_STATUSES.includes(value.status as string);

const isSettingsShape = (value: unknown): boolean =>
  isObject(value) && typeof value.notificationsEnabled === 'boolean' && typeof value.snoozeMinutes === 'number'
  && (value.fontScale === 'normal' || value.fontScale === 'large');

/**
 * Validates the content of a backup file.
 * @param text - raw file content
 * @throws BackupError when the file is not JSON, not from this app, from another data version, or damaged
 */
export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('not_json');
  }
  if (!isObject(data) || data.app !== BACKUP_APP_ID) throw new BackupError('not_a_backup');
  if (data.version !== BACKUP_VERSION) throw new BackupError('unsupported_version');
  if (!Array.isArray(data.medications) || !Array.isArray(data.doseLogs)) throw new BackupError('incomplete');
  if (!data.medications.every(isMedicationShape) || !data.doseLogs.every(isDoseShape)) throw new BackupError('invalid_data');
  if (data.settings != null && !isSettingsShape(data.settings)) throw new BackupError('invalid_data');

  return {
    app: BACKUP_APP_ID,
    version: BACKUP_VERSION,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : '',
    medications: data.medications as Medication[],
    doseLogs: data.doseLogs as DoseLog[],
    photos: Array.isArray(data.photos) ? (data.photos as PrescriptionPhoto[]) : [],
    settings: data.settings ? (data.settings as Settings) : null,
  };
}

export interface BackupService {
  build(): Promise<BackupFile>;
  /** Replaces ALL current data with the backup content (already validated by `parseBackup`). */
  restore(backup: BackupFile): Promise<void>;
  /** Deletes every medication, dose, photo and setting stored on the device. */
  wipeAll(): Promise<void>;
}

/** Builds the backup/restore/wipe use cases on top of the storage ports. */
export function createBackupService(ports: StoragePorts): BackupService {
  const { transactions, medications, doses, photos, settings } = ports;

  const clearAll = () => Promise.all([medications.clear(), doses.clear(), photos.clear(), settings.clear()]);

  return {
    async build() {
      const [allMedications, allDoses, allPhotos, storedSettings] = await Promise.all([
        medications.list(), doses.listAll(), photos.listAll(), settings.get(),
      ]);
      return {
        app: BACKUP_APP_ID,
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        medications: allMedications,
        doseLogs: allDoses,
        photos: allPhotos,
        settings: storedSettings ?? null,
      };
    },

    restore: (backup) =>
      transactions.run(async () => {
        await clearAll();
        await medications.addMany(backup.medications);
        await doses.addMany(backup.doseLogs);
        if (backup.photos.length) await photos.addMany(backup.photos);
        if (backup.settings) await settings.save(backup.settings);
      }),

    wipeAll: () => transactions.run(async () => void (await clearAll())),
  };
}
