import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { ReminderAction } from '../../application/reminderService';
import { app } from '../../composition-root';
import { REMINDER_ACTION_MESSAGES } from '../i18n/messages';
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
      let notice: string | undefined;
      try {
        if (action && !(await app.reminders.handleNotificationAction(doseId, action))) notice = REMINDER_ACTION_MESSAGES.notOpen;
      } catch {
        notice = REMINDER_ACTION_MESSAGES.failed;
      } finally {
        // Always land on Hoje (and drop the reminder link), telling the user when nothing was registered.
        navigate('/', { replace: true, state: notice ? { reminderNotice: notice } : null });
      }
    };

    const link = parseReminderLink(search);
    // Guard: the link is handled once, even if the effect runs again before the URL is cleaned.
    if (link && handledLink.current !== search) {
      handledLink.current = search;
      void apply(link.doseId, link.action);
    }

    const onMessage = (event: MessageEvent) => {
      const click = parseReminderMessage(event.data);
      if (click) void apply(click.doseId, click.action);
    };
    // Popups shown by the page itself (no active service worker) post to the window: same origin only.
    const onWindowMessage = (event: MessageEvent) => event.origin === window.location.origin && onMessage(event);
    window.addEventListener('message', onWindowMessage);
    const serviceWorker = 'serviceWorker' in navigator ? navigator.serviceWorker : undefined;
    serviceWorker?.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onWindowMessage);
      serviceWorker?.removeEventListener('message', onMessage);
    };
  }, [navigate, search]);
}
