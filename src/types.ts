export type ScheduleType = 'interval' | 'fixedTimes';
export type MedStatus = 'active' | 'paused' | 'finished';
export type DoseStatus = 'pending' | 'taken' | 'skipped' | 'missed' | 'snoozed';
export type MedForm = 'comprimido' | 'cápsula' | 'líquido' | 'gotas' | 'pomada' | 'injeção' | 'outro';
export type FontScale = 'normal' | 'grande';

export const MED_FORMS: MedForm[] = ['comprimido', 'cápsula', 'líquido', 'gotas', 'pomada', 'injeção', 'outro'];
export const UNITS = ['mg', 'g', 'mcg', 'ml', 'gotas', 'comprimido(s)', 'cápsula(s)', 'UI', 'aplicação', 'outro'];

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  unit: string;
  form: MedForm;
  instructions: string;
  scheduleType: ScheduleType;
  intervalHours?: number;
  firstDoseTime: string; // HH:mm
  times: string[]; // HH:mm (fixedTimes)
  startDate: string; // yyyy-MM-dd
  endDate?: string; // yyyy-MM-dd (inclusivo)
  durationDays?: number;
  continuous: boolean;
  status: MedStatus;
  prescriber?: string;
  notes?: string;
  ocrRawText?: string;
  photoId?: string; // miniatura guardada (opcional)
  trackFrom: number; // ms: a partir de quando geramos doses
  createdAt: number;
  updatedAt: number;
}

export type MedicationInput = Omit<Medication, 'id' | 'createdAt' | 'updatedAt' | 'trackFrom'>;

export interface DoseLog {
  id: string;
  medicationId: string;
  scheduledAt: number;
  takenAt?: number;
  status: DoseStatus;
  snoozedUntil?: number;
  notifiedAt?: number;
}

export interface Settings {
  key: 'app';
  notificationsEnabled: boolean;
  snoozeMinutes: number;
  fontScale: FontScale;
}

export interface PhotoRecord {
  id: string;
  dataUrl: string;
  createdAt: number;
}

export const DEFAULT_SETTINGS: Settings = {
  key: 'app',
  notificationsEnabled: false,
  snoozeMinutes: 10,
  fontScale: 'normal',
};

export const DISCLAIMER =
  'Este app é um organizador e não substitui a orientação do seu médico ou farmacêutico. Confira sempre os dados com a receita.';
