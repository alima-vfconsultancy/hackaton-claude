import type { DoseStatus } from '../types';

const TEXT: Record<DoseStatus, string> = {
  pending: 'Pendente',
  taken: 'Tomada',
  skipped: 'Pulada',
  missed: 'Perdida',
  snoozed: 'Adiada',
};
export const doseStatusText = (s: DoseStatus) => TEXT[s];
