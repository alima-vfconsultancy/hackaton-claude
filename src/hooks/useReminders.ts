import { useEffect, useRef, useState } from 'react';
import { db } from '../db/db';
import { syncDoses } from '../lib/maintenance';
import { effectiveTime, MISSED_AFTER_MS } from '../lib/doseRules';
import { beep, showDoseNotification } from '../lib/notifications';
import type { DoseLog, Medication } from '../types';

export interface DueDose {
  dose: DoseLog;
  med: Medication;
}

const CHECK_MS = 30_000;

/**
 * Verificação periódica (app aberto ou em segundo plano recente):
 * atualiza as doses, devolve as que já estão na hora (alerta dentro do app)
 * e dispara a notificação via service worker, uma vez por dose.
 */
export function useReminders(notificationsEnabled: boolean): DueDose[] {
  const [due, setDue] = useState<DueDose[]>([]);
  const enabled = useRef(notificationsEnabled);
  enabled.current = notificationsEnabled;

  useEffect(() => {
    let stop = false;
    const check = async () => {
      await syncDoses();
      const now = Date.now();
      const open = await db.doseLogs.where('status').anyOf('pending', 'snoozed').toArray();
      const meds = new Map((await db.medications.toArray()).map((m) => [m.id, m]));
      const list: DueDose[] = open
        .filter((d) => effectiveTime(d) <= now && now - effectiveTime(d) <= MISSED_AFTER_MS && meds.has(d.medicationId))
        .sort((a, b) => effectiveTime(a) - effectiveTime(b))
        .map((dose) => ({ dose, med: meds.get(dose.medicationId)! }));
      if (stop) return;
      setDue((prev) => (prev.map((p) => p.dose.id).join() === list.map((p) => p.dose.id).join() ? prev : list));

      const fresh = list.filter((x) => !x.dose.notifiedAt);
      if (fresh.length) beep();
      for (const { dose, med } of fresh) {
        if (enabled.current) await showDoseNotification(dose, med);
        await db.doseLogs.update(dose.id, { notifiedAt: now });
      }
    };
    void check();
    const i = setInterval(() => void check(), CHECK_MS);
    const onVis = () => document.visibilityState === 'visible' && void check();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop = true;
      clearInterval(i);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return due;
}
