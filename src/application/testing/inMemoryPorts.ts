import { isOpen, type DoseLog } from '../../domain/dose';
import type { Medication } from '../../domain/medication';
import type { PrescriptionPhoto } from '../../domain/photo';
import type { Settings } from '../../domain/settings';
import type {
  DoseRepository, MedicationRepository, PhotoRepository, ReminderNotifier, SettingsRepository, StoragePorts,
} from '../ports';

/** Test helpers: storage ports backed by plain arrays (no real transaction rollback). */

function applyPatch<T extends object>(target: T, patch: Partial<T>): T {
  const merged = { ...target, ...patch };
  for (const key of Object.keys(merged) as Array<keyof T>) if (merged[key] === undefined) delete merged[key];
  return merged;
}

export interface InMemoryStore {
  medications: Medication[];
  doses: DoseLog[];
  photos: PrescriptionPhoto[];
  settings?: Settings;
}

/** Storage ports backed by arrays; `store` exposes the raw state for assertions. */
export function createInMemoryPorts(initial: Partial<InMemoryStore> = {}): StoragePorts & { store: InMemoryStore } {
  const store: InMemoryStore = { medications: [], doses: [], photos: [], ...initial };
  let counter = 0;

  const medications: MedicationRepository = {
    list: async () => [...store.medications],
    findById: async (id) => store.medications.find((m) => m.id === id),
    addMany: async (items) => void store.medications.push(...items),
    update: async (id, patch) => {
      store.medications = store.medications.map((m) => (m.id === id ? applyPatch(m, patch) : m));
    },
    remove: async (id) => {
      store.medications = store.medications.filter((m) => m.id !== id);
    },
    clear: async () => {
      store.medications = [];
    },
  };

  const doses: DoseRepository = {
    listAll: async () => [...store.doses],
    listBetween: async (from, to) => store.doses.filter((d) => d.scheduledAt >= from && d.scheduledAt <= to),
    listByMedication: async (medicationId) =>
      store.doses.filter((d) => d.medicationId === medicationId).sort((a, b) => a.scheduledAt - b.scheduledAt),
    listOpen: async () => store.doses.filter(isOpen),
    addMany: async (items) => void store.doses.push(...items),
    update: async (id, patch) => {
      store.doses = store.doses.map((d) => (d.id === id ? applyPatch(d, patch) : d));
    },
    removeMany: async (ids) => {
      store.doses = store.doses.filter((d) => !ids.includes(d.id));
    },
    removeByMedication: async (medicationId) => {
      store.doses = store.doses.filter((d) => d.medicationId !== medicationId);
    },
    clear: async () => {
      store.doses = [];
    },
  };

  const settings: SettingsRepository = {
    get: async () => store.settings,
    save: async (value) => {
      store.settings = value;
    },
    clear: async () => {
      store.settings = undefined;
    },
  };

  const photos: PhotoRepository = {
    listAll: async () => [...store.photos],
    findById: async (id) => store.photos.find((p) => p.id === id),
    add: async (photo) => void store.photos.push(photo),
    addMany: async (items) => void store.photos.push(...items),
    remove: async (id) => {
      store.photos = store.photos.filter((p) => p.id !== id);
    },
    clear: async () => {
      store.photos = [];
    },
  };

  return {
    store,
    transactions: { run: (work) => work() },
    ids: { next: () => `id-${++counter}` },
    medications,
    doses,
    settings,
    photos,
  };
}

export interface RecordingNotifier extends ReminderNotifier {
  shown: Array<{ doseId: string; medicationId: string }>;
  alerts: number;
}

/** Notifier that records what it was asked to show instead of showing it. */
export function createRecordingNotifier(): RecordingNotifier {
  const notifier: RecordingNotifier = {
    shown: [],
    alerts: 0,
    isSupported: () => true,
    getPermission: () => 'granted',
    requestPermission: async () => 'granted',
    showDoseReminder: async (dose, medication) => {
      notifier.shown.push({ doseId: dose.id, medicationId: medication.id });
      return true;
    },
    playAlert: () => {
      notifier.alerts++;
    },
  };
  return notifier;
}

/** A valid medication for tests; override any field. */
export function buildMedication(overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'med-1',
    name: 'Amoxicilina',
    dosage: { amount: 500, unit: 'mg' },
    form: 'capsule',
    instructions: '',
    schedule: { type: 'interval', intervalHours: 8, firstDoseTime: '08:00' },
    period: { startDate: '2026-03-10', endDate: '2026-03-16' },
    status: 'active',
    prescriber: '',
    notes: '',
    dosesTrackedFrom: 0,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

/** A valid dose for tests; override any field. */
export function buildDose(overrides: Partial<DoseLog> = {}): DoseLog {
  return { id: 'dose-1', medicationId: 'med-1', scheduledAt: 0, status: 'pending', ...overrides };
}
