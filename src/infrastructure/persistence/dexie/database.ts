import Dexie, { type Table } from 'dexie';
import type { DoseLog } from '../../../domain/dose';
import type { Medication } from '../../../domain/medication';
import type { PrescriptionPhoto } from '../../../domain/photo';
import type { Settings } from '../../../domain/settings';

/** Settings are stored as a single row with a fixed key. */
export type SettingsRow = Settings & { key: 'app' };

export const SETTINGS_KEY = 'app';

const TABLE_NAMES = ['medications', 'doseLogs', 'settings', 'photos'] as const;

export class AppDatabase extends Dexie {
  medications!: Table<Medication, string>;
  doseLogs!: Table<DoseLog, string>;
  settings!: Table<SettingsRow, string>;
  photos!: Table<PrescriptionPhoto, string>;

  constructor(name = 'meu-remedio') {
    super(name);
    // Version 1: first prototype (flat medication records, Portuguese enum values).
    this.version(1).stores({
      medications: 'id, status, name, startDate, photoId',
      doseLogs: 'id, medicationId, scheduledAt, status, &[medicationId+scheduledAt]',
      settings: 'key',
      photos: 'id',
    });
    // Version 2: normalized records (nested schedule/period, English enum values).
    // The prototype was never released, so its data is discarded instead of migrated.
    this.version(2)
      .stores({
        medications: 'id, status, name, period.startDate, photoId',
        doseLogs: 'id, medicationId, scheduledAt, status, &[medicationId+scheduledAt]',
        settings: 'key',
        photos: 'id',
      })
      .upgrade((transaction) => Promise.all(TABLE_NAMES.map((table) => transaction.table(table).clear())).then(() => undefined));
  }
}
