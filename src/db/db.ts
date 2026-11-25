import Dexie, { type Table } from 'dexie';
import type { DoseLog, Medication, PhotoRecord, Settings } from '../types';

export class MeuRemedioDB extends Dexie {
  medications!: Table<Medication, string>;
  doseLogs!: Table<DoseLog, string>;
  settings!: Table<Settings, string>;
  photos!: Table<PhotoRecord, string>;

  constructor() {
    super('meu-remedio');
    this.version(1).stores({
      medications: 'id, status, name, startDate, photoId',
      doseLogs: 'id, medicationId, scheduledAt, status, &[medicationId+scheduledAt]',
      settings: 'key',
      photos: 'id',
    });
  }
}

export const db = new MeuRemedioDB();

export function newId(): string {
  return crypto.randomUUID();
}
