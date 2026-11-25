import type { StoragePorts } from '../../../application/ports';
import { AppDatabase, SETTINGS_KEY } from './database';

/**
 * IndexedDB (Dexie) implementation of the storage ports.
 *
 * @param database - database to use; defaults to the app database
 */
export function createDexieStoragePorts(database: AppDatabase = new AppDatabase()): StoragePorts {
  const { medications, doseLogs, settings, photos } = database;

  return {
    transactions: {
      // Every repository call made inside `work` joins the same transaction.
      run: (work) => database.transaction('rw', [medications, doseLogs, settings, photos], work),
    },

    ids: { next: () => crypto.randomUUID() },

    medications: {
      list: () => medications.toArray(),
      findById: (id) => medications.get(id),
      addMany: async (items) => void (await medications.bulkAdd(items)),
      update: async (id, patch) => void (await medications.update(id, patch)),
      remove: (id) => medications.delete(id),
      clear: () => medications.clear(),
    },

    doses: {
      listAll: () => doseLogs.toArray(),
      listBetween: (from, to) => doseLogs.where('scheduledAt').between(from, to, true, true).toArray(),
      listByMedication: (medicationId) => doseLogs.where('medicationId').equals(medicationId).sortBy('scheduledAt'),
      listOpen: () => doseLogs.where('status').anyOf('pending', 'snoozed').toArray(),
      addMany: async (items) => void (await doseLogs.bulkAdd(items)),
      update: async (id, patch) => void (await doseLogs.update(id, patch)),
      removeMany: (ids) => doseLogs.bulkDelete(ids),
      removeByMedication: async (medicationId) => void (await doseLogs.where('medicationId').equals(medicationId).delete()),
      clear: () => doseLogs.clear(),
    },

    settings: {
      async get() {
        const row = await settings.get(SETTINGS_KEY);
        if (!row) return undefined;
        const { key: _key, ...stored } = row;
        return stored;
      },
      save: async (value) => void (await settings.put({ ...value, key: SETTINGS_KEY })),
      clear: () => settings.clear(),
    },

    photos: {
      listAll: () => photos.toArray(),
      findById: (id) => photos.get(id),
      add: async (photo) => void (await photos.add(photo)),
      addMany: async (items) => void (await photos.bulkAdd(items)),
      remove: (id) => photos.delete(id),
      clear: () => photos.clear(),
    },
  };
}
