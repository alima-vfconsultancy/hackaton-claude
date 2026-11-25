import { DEFAULT_SETTINGS, type Settings } from '../domain/settings';
import type { SettingsRepository } from './ports';

export interface SettingsService {
  /** Stored settings, or the defaults until the user changes something. */
  get(): Promise<Settings>;
  save(patch: Partial<Settings>): Promise<void>;
}

/** Builds the settings use cases on top of the settings repository. */
export function createSettingsService(repository: SettingsRepository): SettingsService {
  const get = async () => (await repository.get()) ?? DEFAULT_SETTINGS;
  return {
    get,
    async save(patch) {
      await repository.save({ ...(await get()), ...patch });
    },
  };
}
