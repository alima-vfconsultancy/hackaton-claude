import type { NotificationPermissionState, ReminderNotifier } from '../../application/ports';
import { REMINDER_CLICK_MESSAGE } from '../../application/reminderService';
import { formatDosage } from '../../shared/ptBR/format';
import { APP_NAME } from '../../shared/brand';

const isSupported = () => typeof Notification !== 'undefined' && 'serviceWorker' in navigator;

const getPermission = (): NotificationPermissionState => (isSupported() ? Notification.permission : 'unsupported');

/** The service worker that can show notifications, or `undefined` when none is active yet (dev server, first visit). */
async function activeRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration?.active ? registration : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Browser notifications, all on the device. Through the service worker when it is active
 * (with the "Tomei"/"Adiar" buttons, works in the background); otherwise straight from the
 * page, like WhatsApp Web, so the popup also appears before the service worker takes over.
 */
export function createBrowserReminderNotifier(): ReminderNotifier {
  /** Popups created by the page, by dose id, so they can be closed when the dose is registered. */
  const pagePopups = new Map<string, Notification>();

  return {
    isSupported,
    getPermission,

    async requestPermission() {
      if (!isSupported()) return 'unsupported';
      return Notification.requestPermission();
    },

    async showDoseReminder(dose, medication) {
      if (getPermission() !== 'granted') return false;
      const title = `Hora de tomar ${medication.name}`;
      const common = {
        body: [formatDosage(medication.dosage), medication.instructions].filter(Boolean).join(' · ') || 'Abra o app para registrar a dose.',
        tag: dose.id,
        // Read by public/sw-notifications.js to know which dose the buttons refer to.
        data: { doseId: dose.id },
        // Stays on screen until the user acts.
        requireInteraction: true,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        lang: 'pt-BR',
      };
      try {
        const registration = await activeRegistration();
        if (registration) {
          await registration.showNotification(title, {
            ...common,
            // Buttons are ignored where unsupported (iPhone): tapping the notification still opens Hoje.
            actions: [
              { action: 'take', title: 'Tomei' },
              { action: 'snooze', title: 'Adiar' },
            ],
            // Alerts again when a snoozed dose comes back.
            renotify: true,
            vibrate: [200, 100, 200, 100, 200],
          } as NotificationOptions);
          return true;
        }

        // Page notifications cannot have buttons: a click focuses the app and opens Hoje.
        const popup = new Notification(title, common);
        popup.onclick = () => {
          window.focus();
          popup.close();
          window.postMessage({ type: REMINDER_CLICK_MESSAGE, doseId: dose.id, action: '' }, window.location.origin);
        };
        popup.onclose = () => {
          if (pagePopups.get(dose.id) === popup) pagePopups.delete(dose.id);
        };
        pagePopups.get(dose.id)?.close();
        pagePopups.set(dose.id, popup);
        return true;
      } catch {
        return false;
      }
    },

    showPendingCount(count) {
      try {
        document.title = count > 0 ? `(${count}) ${APP_NAME}` : APP_NAME;
        // Badging API: number on the installed app icon, where the system supports it.
        if (count > 0) void navigator.setAppBadge?.(count)?.catch(() => {});
        else void navigator.clearAppBadge?.()?.catch(() => {});
      } catch {
        /* the counter is a convenience only */
      }
    },

    async dismissDoseReminder(doseId) {
      pagePopups.get(doseId)?.close();
      if (!isSupported()) return;
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const open = (await registration?.getNotifications({ tag: doseId })) ?? [];
        for (const notification of open) notification.close();
      } catch {
        /* nothing to close */
      }
    },

    playAlert() {
      try {
        const AudioContextClass = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const context = new AudioContextClass();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.value = 880;
        gain.gain.value = 0.15;
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.35);
        oscillator.onended = () => void context.close();
      } catch {
        /* the browser may block audio; ignore */
      }
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        /* ignore */
      }
    },
  };
}
