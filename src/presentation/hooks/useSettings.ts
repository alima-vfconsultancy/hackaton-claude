import { app } from '../../composition-root';
import { DEFAULT_SETTINGS, type Settings } from '../../domain/settings';
import { useLiveData } from './useLiveData';

export function useSettings(): Settings {
  return useLiveData(() => app.settings.get(), []) ?? DEFAULT_SETTINGS;
}
