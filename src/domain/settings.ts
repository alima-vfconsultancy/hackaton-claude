export type FontScale = 'normal' | 'large';

export interface Settings {
  notificationsEnabled: boolean;
  snoozeMinutes: number;
  fontScale: FontScale;
  /** The user agreed to send medication and allergy names to the AI analysis service. */
  allergyAiConsent: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  notificationsEnabled: false,
  snoozeMinutes: 10,
  fontScale: 'normal',
  allergyAiConsent: false,
};
