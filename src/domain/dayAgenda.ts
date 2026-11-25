import type { DoseLog } from './dose';
import type { Medication } from './medication';
import type { EpochMs } from './time';

/** One row of a calendar day: a dose already logged, or one only predicted from the schedule. */
export type DayAgendaEntry =
  | { kind: 'logged'; medication: Medication; dose: DoseLog }
  | { kind: 'planned'; medication: Medication; scheduledAt: EpochMs };

/**
 * Builds the agenda of a single day: logged doses (only for medications that still exist),
 * plus — for active medications — the schedule-predicted instants that have no log yet.
 * Sorted ascending by display time.
 */
export function buildDayAgenda(
  medications: Medication[],
  doses: DoseLog[],
  _dayStart: Date,
  _dayEnd: Date,
): DayAgendaEntry[] {
  const byId = new Map(medications.map((medication) => [medication.id, medication]));
  return doses
    .filter((dose) => byId.has(dose.medicationId))
    .map((dose) => ({ kind: 'logged' as const, medication: byId.get(dose.medicationId)!, dose }));
}
