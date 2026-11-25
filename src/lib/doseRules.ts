import type { DoseLog } from '../types';

export const MISSED_AFTER_MS = 2 * 3_600_000;

/** Dose pendente/adiada com mais de 2h de atraso vira "perdida". */
export function isMissed(d: Pick<DoseLog, 'status' | 'scheduledAt' | 'snoozedUntil'>, now: number): boolean {
  if (d.status !== 'pending' && d.status !== 'snoozed') return false;
  const ref = d.snoozedUntil ?? d.scheduledAt;
  return now - ref > MISSED_AFTER_MS;
}

/** Dose "no ar": pendente ou adiada, ainda não resolvida. */
export const isOpen = (d: Pick<DoseLog, 'status'>) => d.status === 'pending' || d.status === 'snoozed';

/** Horário efetivo de exibição/alerta (considera adiamento). */
export const effectiveTime = (d: Pick<DoseLog, 'scheduledAt' | 'snoozedUntil' | 'status'>) =>
  d.status === 'snoozed' && d.snoozedUntil ? d.snoozedUntil : d.scheduledAt;
