export type FontScale = 'normal' | 'large';

export interface Settings {
  notificationsEnabled: boolean;
  snoozeMinutes: number;
  fontScale: FontScale;
}

export const DEFAULT_SETTINGS: Settings = {
  notificationsEnabled: false,
  snoozeMinutes: 10,
  fontScale: 'normal',
};
