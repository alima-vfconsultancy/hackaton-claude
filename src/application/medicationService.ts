import { isOpen, type DoseLog } from '../domain/dose';
import {
  normalizeMedicationDraft, TRACKING_LOOKBACK_MS,
  type Medication, type MedicationDraft, type TreatmentStatus,
} from '../domain/medication';
import type { PrescriptionPhoto } from '../domain/photo';
import type { StoragePorts } from './ports';
import type { SyncDoses } from './syncDoses';

export interface MedicationDetail {
  medication: Medication;
  /** Ascending by scheduled time. */
  doses: DoseLog[];
  photo?: PrescriptionPhoto;
}

export interface MedicationService {
  list(): Promise<Medication[]>;
  get(id: string): Promise<Medication | undefined>;
  /** The medication with its dose log and stored prescription photo; `undefined` if it does not exist. */
  getDetail(id: string): Promise<MedicationDetail | undefined>;
  /**
   * Creates medications the user has already reviewed and confirmed, then generates their doses.
   * @param photoDataUrl - prescription thumbnail to store and link to every created medication
   * @returns the new medication ids, in the same order as `drafts`
   */
  create(drafts: MedicationDraft[], photoDataUrl?: string): Promise<string[]>;
  /** Replaces the editable fields and regenerates the doses that are still open. */
  update(id: string, draft: MedicationDraft): Promise<void>;
  /** Pausing or finishing removes open doses; resuming generates them again. */
  setStatus(id: string, status: TreatmentStatus): Promise<void>;
  /** Removes the medication, its doses and its photo (when no other medication uses it). */
  remove(id: string): Promise<void>;
}

/** Builds the medication use cases; `syncDoses` regenerates doses after every schedule change. */
export function createMedicationService(ports: StoragePorts, syncDoses: SyncDoses): MedicationService {
  const { transactions, medications, doses, photos, ids } = ports;

  const removeOpenDoses = async (medicationId: string) => {
    const open = (await doses.listByMedication(medicationId)).filter(isOpen);
    await doses.removeMany(open.map((dose) => dose.id));
  };

  return {
    list: () => medications.list(),
    get: (id) => medications.findById(id),

    async getDetail(id) {
      const medication = await medications.findById(id);
      if (!medication) return undefined;
      const [medicationDoses, photo] = await Promise.all([
        doses.listByMedication(id),
        medication.photoId ? photos.findById(medication.photoId) : undefined,
      ]);
      return { medication, doses: medicationDoses, photo };
    },

    async create(drafts, photoDataUrl) {
      const now = Date.now();
      let photoId: string | undefined;
      if (photoDataUrl) {
        photoId = ids.next();
        await photos.add({ id: photoId, dataUrl: photoDataUrl, createdAt: now });
      }
      const created: Medication[] = drafts.map((draft) => ({
        ...normalizeMedicationDraft(draft),
        id: ids.next(),
        ...(photoId ? { photoId } : {}),
        dosesTrackedFrom: now - TRACKING_LOOKBACK_MS,
        createdAt: now,
        updatedAt: now,
      }));
      await medications.addMany(created);
      await syncDoses(now);
      return created.map((medication) => medication.id);
    },

    async update(id, draft) {
      const now = Date.now();
      await transactions.run(async () => {
        await medications.update(id, {
          ...normalizeMedicationDraft(draft),
          dosesTrackedFrom: now - TRACKING_LOOKBACK_MS,
          updatedAt: now,
        });
        // The schedule may have changed: open doses are rebuilt, resolved ones stay in the history.
        await removeOpenDoses(id);
      });
      await syncDoses(now);
    },

    async setStatus(id, status) {
      const now = Date.now();
      await transactions.run(async () => {
        const patch: Partial<Medication> = { status, updatedAt: now };
        if (status === 'active') patch.dosesTrackedFrom = now - TRACKING_LOOKBACK_MS;
        await medications.update(id, patch);
        if (status !== 'active') await removeOpenDoses(id);
      });
      if (status === 'active') await syncDoses(now);
    },

    async remove(id) {
      await transactions.run(async () => {
        const medication = await medications.findById(id);
        await doses.removeByMedication(id);
        await medications.remove(id);
        if (medication?.photoId) {
          const stillUsed = (await medications.list()).some((other) => other.photoId === medication.photoId);
          if (!stillUsed) await photos.remove(medication.photoId);
        }
      });
    },
  };
}
