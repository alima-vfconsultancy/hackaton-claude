import { useEffect, useRef, useState } from 'react';
import type { DueDose } from '../../application/reminderService';
import { app } from '../../composition-root';
import { useLiveData } from './useLiveData';

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
  const checkNow = useRef<() => void>(() => {});

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      const list = await app.reminders.check({ notificationsEnabled: notificationsEnabledRef.current });
      if (stopped) return;
      // Keep the same array when nothing changed, to avoid useless re-renders.
      setDue((previous) => (previous.map((item) => item.dose.id).join() === list.map((item) => item.dose.id).join() ? previous : list));
    };
    checkNow.current = () => void check();
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

  // Re-check as soon as a dose of today changes (taken, skipped, snoozed), so the counter on the tab
  // and the banner update right away instead of on the next 30 s tick. `notifiedAt` is left out on purpose.
  const todayKey = useLiveData(
    () =>
      app.doses
        .getToday(new Date())
        .then(({ entries }) => entries.map(({ dose }) => `${dose.id}:${dose.status}:${dose.snoozedUntil ?? ''}`).join()),
    [],
  );
  useEffect(() => {
    if (todayKey !== undefined) checkNow.current();
  }, [todayKey]);

  return due;
}
