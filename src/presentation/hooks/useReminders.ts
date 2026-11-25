import { useEffect, useRef, useState } from 'react';
import type { DueDose } from '../../application/reminderService';
import { app } from '../../composition-root';

const CHECK_INTERVAL_MS = 30_000;

/**
 * Periodic check while the app is open (or was recently in the background):
 * returns the doses that are due now, for the in-app banner. The application layer
 * also fires the system notification, once per dose.
 */
export function useReminders(notificationsEnabled: boolean): DueDose[] {
  const [due, setDue] = useState<DueDose[]>([]);
  const notificationsEnabledRef = useRef(notificationsEnabled);
  notificationsEnabledRef.current = notificationsEnabled;

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      const list = await app.reminders.check({ notificationsEnabled: notificationsEnabledRef.current });
      if (stopped) return;
      // Keep the same array when nothing changed, to avoid useless re-renders.
      setDue((previous) => (previous.map((item) => item.dose.id).join() === list.map((item) => item.dose.id).join() ? previous : list));
    };
    void check();
    const timer = setInterval(() => void check(), CHECK_INTERVAL_MS);
    const onVisibilityChange = () => document.visibilityState === 'visible' && void check();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return due;
}
