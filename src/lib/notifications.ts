import type { DoseLog, Medication } from '../types';
import { doseLabel } from './format';

export const notificationsSupported = () => typeof Notification !== 'undefined' && 'serviceWorker' in navigator;

export const permissionState = (): NotificationPermission | 'unsupported' =>
  notificationsSupported() ? Notification.permission : 'unsupported';

/** Deve ser chamado a partir de um toque do usuário, depois de explicar o motivo. */
export async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  return Notification.requestPermission();
}

export async function showDoseNotification(dose: DoseLog, med: Medication): Promise<boolean> {
  if (permissionState() !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(`Hora de tomar ${med.name}`, {
      body: [doseLabel(med), med.instructions].filter(Boolean).join(' · ') || 'Abra o app para registrar a dose.',
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
}

/** Bipe curto no app aberto (pode ser bloqueado pelo navegador; falha em silêncio). */
export function beep(): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
    osc.onended = () => void ctx.close();
  } catch {
    /* ignora */
  }
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {
    /* ignora */
  }
}
