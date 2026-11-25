import { endOfDay, isBefore, startOfDay } from 'date-fns';
import { db, newId } from '../db/db';
import type { DoseLog } from '../types';
import { generateDoseTimes, parseDate } from './schedule';
import { isMissed } from './doseRules';

export interface SyncSummary {
  newlyMissed: number;
}

/**
 * Mantém o banco coerente com o relógio:
 * 1. encerra tratamentos com endDate no passado;
 * 2. cria as doses (pendentes) previstas até o fim de hoje;
 * 3. marca como "perdida" a dose pendente com mais de 2h de atraso.
 */
export async function syncDoses(now = Date.now()): Promise<SyncSummary> {
  const nowDate = new Date(now);
  const today = startOfDay(nowDate);
  let newlyMissed = 0;

  await db.transaction('rw', db.medications, db.doseLogs, async () => {
    const meds = await db.medications.toArray();

    for (const m of meds) {
      if (m.status === 'active' && !m.continuous && m.endDate && isBefore(parseDate(m.endDate), today)) {
        m.status = 'finished';
        await db.medications.update(m.id, { status: 'finished', updatedAt: now });
      }
      if (m.status !== 'active') continue;

      const from = new Date(Math.max(m.trackFrom, parseDate(m.startDate).getTime()));
      const times = generateDoseTimes(m, from, endOfDay(nowDate));
      if (times.length === 0) continue;

      const existing = await db.doseLogs.where('medicationId').equals(m.id).toArray();
      const have = new Set(existing.map((d) => d.scheduledAt));
      const fresh: DoseLog[] = times
        .filter((t) => !have.has(t))
        .map((t) => ({ id: newId(), medicationId: m.id, scheduledAt: t, status: 'pending' }));
      if (fresh.length) await db.doseLogs.bulkAdd(fresh);
    }

    const open = await db.doseLogs.where('status').anyOf('pending', 'snoozed').toArray();
    for (const d of open) {
      if (isMissed(d, now)) {
        await db.doseLogs.update(d.id, { status: 'missed' });
        newlyMissed++;
      }
    }
  });

  return { newlyMissed };
}
