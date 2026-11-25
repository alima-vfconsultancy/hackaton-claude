import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { DEFAULT_SETTINGS, type Settings } from '../types';

export function useSettings(): Settings {
  const s = useLiveQuery(() => db.settings.get('app'), []);
  return s ?? DEFAULT_SETTINGS;
}
