import { endOfDay, startOfDay } from 'date-fns';
import { buildDayAgenda, type DayAgendaEntry } from '../domain/dayAgenda';
import { generateDoseTimes } from '../domain/schedule';
import { formatLocalDate, type LocalDate } from '../domain/time';
import type { StoragePorts } from './ports';

export interface AgendaService {
  /** Doses of one calendar day: logged entries plus, for active medications, upcoming planned ones. */
  getDayAgenda(date: Date): Promise<DayAgendaEntry[]>;
  /** Local dates (within `[monthStart, monthEnd]`) that have at least one logged or planned dose. */
  getDatesWithDoses(monthStart: Date, monthEnd: Date): Promise<Set<LocalDate>>;
}

export function createAgendaService(ports: StoragePorts): AgendaService {
  const { medications, doses } = ports;

  return {
    async getDayAgenda(date) {
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      const [dayDoses, allMedications] = await Promise.all([
        doses.listBetween(dayStart.getTime(), dayEnd.getTime()),
        medications.list(),
      ]);
      return buildDayAgenda(allMedications, dayDoses, dayStart, dayEnd);
    },

    async getDatesWithDoses(monthStart, monthEnd) {
      const [rangeDoses, allMedications] = await Promise.all([
        doses.listBetween(monthStart.getTime(), monthEnd.getTime()),
        medications.list(),
      ]);
      const byId = new Map(allMedications.map((medication) => [medication.id, medication]));
      const dates = new Set<LocalDate>();
      for (const dose of rangeDoses) {
        if (byId.has(dose.medicationId)) dates.add(formatLocalDate(new Date(dose.scheduledAt)));
      }
      for (const medication of allMedications) {
        if (medication.status !== 'active') continue;
        for (const instant of generateDoseTimes(medication, monthStart, monthEnd)) {
          dates.add(formatLocalDate(new Date(instant)));
        }
      }
      return dates;
    },
  };
}
