import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ReminderAction } from '../../application/reminderService';
import { app } from '../../composition-root';
import { parseReminderLink, parseReminderMessage } from './reminderNotificationLinks';

/**
 * Applies the "Tomei" / "Adiar" buttons of the reminder notifications and opens Hoje.
 * The service worker either opens a reminder link (app closed) or messages the open window.
 */
export function useNotificationActions(): void {
  const navigate = useNavigate();
  const { search } = useLocation();
  const handledLink = useRef('');

  useEffect(() => {
    const apply = async (doseId: string, action: ReminderAction | null) => {
      if (action) await app.reminders.handleNotificationAction(doseId, action);
      navigate('/', { replace: true });
    };

    const link = parseReminderLink(search);
    // Guard: the link is handled once, even if the effect runs again before the URL is cleaned.
    if (link && handledLink.current !== search) {
      handledLink.current = search;
      void apply(link.doseId, link.action);
    }

    if (!('serviceWorker' in navigator)) return;
    const onMessage = (event: MessageEvent) => {
      const click = parseReminderMessage(event.data);
      if (click) void apply(click.doseId, click.action);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [navigate, search]);
}
