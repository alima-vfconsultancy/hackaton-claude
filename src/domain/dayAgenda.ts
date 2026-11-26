import { effectiveTime, type DoseLog } from './dose';
import type { Medication } from './medication';
import { generateDoseTimes } from './schedule';
import type { EpochMs } from './time';

/** One row of a calendar day: a dose already logged, or one only predicted from the schedule. */
export type DayAgendaEntry =
  | { kind: 'logged'; medication: Medication; dose: DoseLog }
  | { kind: 'planned'; medication: Medication; scheduledAt: EpochMs };

/** Instant used to sort/display an entry. */
export const dayAgendaEntryTime = (entry: DayAgendaEntry): EpochMs =>
  entry.kind === 'logged' ? effectiveTime(entry.dose) : entry.scheduledAt;

/**
 * Builds the agenda of a single day: logged doses (only for medications that still exist),
 * plus — for active medications — the schedule-predicted instants that have no log yet.
 * Sorted ascending by display time.
 */
export function buildDayAgenda(
  medications: Medication[],
  doses: DoseLog[],
  dayStart: Date,
  dayEnd: Date,
): DayAgendaEntry[] {
  const byId = new Map(medications.map((medication) => [medication.id, medication]));
  const logged: DayAgendaEntry[] = doses
    .filter((dose) => byId.has(dose.medicationId))
    .map((dose) => ({ kind: 'logged' as const, medication: byId.get(dose.medicationId)!, dose }));

  const loggedInstants = new Set(doses.map((dose) => `${dose.medicationId}:${dose.scheduledAt}`));
  const planned: DayAgendaEntry[] = medications
    .filter((medication) => medication.status === 'active')
    .flatMap((medication) =>
      generateDoseTimes(medication, dayStart, dayEnd)
        .filter((scheduledAt) => !loggedInstants.has(`${medication.id}:${scheduledAt}`))
        .map((scheduledAt) => ({ kind: 'planned' as const, medication, scheduledAt })),
    );

  return [...logged, ...planned].sort((a, b) => dayAgendaEntryTime(a) - dayAgendaEntryTime(b));
}
