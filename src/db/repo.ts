import { db, newId } from './db';
import { DEFAULT_SETTINGS, type DoseLog, type Medication, type MedicationInput, type Settings } from '../types';
import { computeEndDate } from '../lib/schedule';
import { syncDoses } from '../lib/maintenance';

const TWO_HOURS = 2 * 3_600_000;

/** Garante coerência entre duração e data de término. */
export function normalizeInput(input: MedicationInput): MedicationInput {
  const m = { ...input, name: input.name.trim() };
  if (m.continuous) {
    m.endDate = undefined;
    m.durationDays = undefined;
  } else if (m.durationDays && m.durationDays > 0) {
    m.endDate = computeEndDate(m.startDate, m.durationDays);
  }
  return m;
}

export async function savePhoto(dataUrl: string): Promise<string> {
  const id = newId();
  await db.photos.add({ id, dataUrl, createdAt: Date.now() });
  return id;
}

/** Cria vários medicamentos de uma vez (usado na confirmação da revisão). */
export async function createMedications(inputs: MedicationInput[], photoDataUrl?: string): Promise<string[]> {
  const now = Date.now();
  const photoId = photoDataUrl ? await savePhoto(photoDataUrl) : undefined;
  const ids: string[] = [];
  const rows: Medication[] = inputs.map((raw) => {
    const m = normalizeInput(raw);
    const id = newId();
    ids.push(id);
    return { ...m, id, photoId: m.photoId ?? photoId, trackFrom: now - TWO_HOURS, createdAt: now, updatedAt: now };
  });
  await db.medications.bulkAdd(rows);
  await syncDoses(now);
  return ids;
}

export async function createMedication(input: MedicationInput): Promise<string> {
  return (await createMedications([input]))[0];
}

export async function updateMedication(id: string, input: MedicationInput): Promise<void> {
  const now = Date.now();
  const m = normalizeInput(input);
  await db.transaction('rw', db.medications, db.doseLogs, async () => {
    await db.medications.update(id, { ...m, trackFrom: now - TWO_HOURS, updatedAt: now });
    // A agenda pode ter mudado: refaz as doses ainda não resolvidas.
    const open = await db.doseLogs.where('medicationId').equals(id).filter((d) => d.status === 'pending' || d.status === 'snoozed').primaryKeys();
    await db.doseLogs.bulkDelete(open);
  });
  await syncDoses(now);
}

export async function setMedicationStatus(id: string, status: Medication['status']): Promise<void> {
  const now = Date.now();
  await db.transaction('rw', db.medications, db.doseLogs, async () => {
    const patch: Partial<Medication> = { status, updatedAt: now };
    if (status === 'active') patch.trackFrom = now - TWO_HOURS;
    await db.medications.update(id, patch);
    if (status !== 'active') {
      const open = await db.doseLogs.where('medicationId').equals(id).filter((d) => d.status === 'pending' || d.status === 'snoozed').primaryKeys();
      await db.doseLogs.bulkDelete(open);
    }
  });
  if (status === 'active') await syncDoses(now);
}

export async function deleteMedication(id: string): Promise<void> {
  await db.transaction('rw', db.medications, db.doseLogs, db.photos, async () => {
    const med = await db.medications.get(id);
    await db.doseLogs.where('medicationId').equals(id).delete();
    await db.medications.delete(id);
    if (med?.photoId) {
      const still = await db.medications.where('photoId').equals(med.photoId).count().catch(() => 0);
      if (!still) await db.photos.delete(med.photoId);
    }
  });
}

export async function markDose(id: string, status: 'taken' | 'skipped'): Promise<void> {
  await db.doseLogs.update(id, {
    status,
    takenAt: status === 'taken' ? Date.now() : undefined,
    snoozedUntil: undefined,
  });
}

export async function snoozeDose(id: string, minutes: number): Promise<void> {
  await db.doseLogs.update(id, { status: 'snoozed', snoozedUntil: Date.now() + minutes * 60_000, notifiedAt: undefined });
}

export async function undoDose(id: string): Promise<void> {
  await db.doseLogs.update(id, { status: 'pending', takenAt: undefined, snoozedUntil: undefined, notifiedAt: undefined });
  await syncDoses();
}

export async function getSettings(): Promise<Settings> {
  return (await db.settings.get('app')) ?? DEFAULT_SETTINGS;
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const cur = await getSettings();
  await db.settings.put({ ...cur, ...patch, key: 'app' });
}

export type { DoseLog };
