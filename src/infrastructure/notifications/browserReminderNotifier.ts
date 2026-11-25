import type { NotificationPermissionState, ReminderNotifier } from '../../application/ports';
import { formatDosage } from '../../shared/ptBR/format';

const isSupported = () => typeof Notification !== 'undefined' && 'serviceWorker' in navigator;

const getPermission = (): NotificationPermissionState => (isSupported() ? Notification.permission : 'unsupported');

/** Notifications go through the service worker so they also work when the app is in the background. */
export const createBrowserReminderNotifier = (): ReminderNotifier => ({
  isSupported,
  getPermission,

  async requestPermission() {
    if (!isSupported()) return 'unsupported';
    return Notification.requestPermission();
  },

  async showDoseReminder(dose, medication) {
    if (getPermission() !== 'granted') return false;
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(`Hora de tomar ${medication.name}`, {
        body: [formatDosage(medication.dosage), medication.instructions].filter(Boolean).join(' · ') || 'Abra o app para registrar a dose.',
        tag: dose.id,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [200, 100, 200, 100, 200],
        lang: 'pt-BR',
      } as NotificationOptions);
      return true;
    } catch {
      return false;
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
});
