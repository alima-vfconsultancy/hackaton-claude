import type { NotificationPermissionState } from '../../application/ports';
import { REMINDER_CLICK_MESSAGE, type ReminderAction } from '../../application/reminderService';

/*
 * Contract with `public/sw-notifications.js` (plain JS, it cannot import this file):
 * - app closed: the service worker opens `/?lembrete=<doseId>&acao=tomar|adiar`;
 * - app open: it (or a page popup) sends a `REMINDER_CLICK_MESSAGE` to the window.
 */

/** URL values are user-facing, so they stay in Portuguese. */
const ACTION_BY_PARAM: Record<string, ReminderAction> = { tomar: 'take', adiar: 'snooze' };

export interface ReminderClick {
  doseId: string;
  /** `null` when the notification itself was tapped: just open Hoje. */
  action: ReminderAction | null;
}

/**
 * Reads the notification button from the URL the service worker opened.
 *
 * @param search - `location.search`
 * @returns the dose and button, or `null` when the URL is not a reminder link
 */
export function parseReminderLink(search: string): { doseId: string; action: ReminderAction } | null {
  const params = new URLSearchParams(search);
  const doseId = params.get('lembrete');
  const action = ACTION_BY_PARAM[params.get('acao') ?? ''];
  return doseId && action ? { doseId, action } : null;
}

/**
 * Reads a notification click forwarded by the service worker to an open window.
 *
 * @param data - `MessageEvent.data`
 * @returns the click, or `null` for any other message
 */
export function parseReminderMessage(data: unknown): ReminderClick | null {
  if (typeof data !== 'object' || data === null) return null;
  const { type, doseId, action } = data as Record<string, unknown>;
  if (type !== REMINDER_CLICK_MESSAGE || typeof doseId !== 'string' || !doseId) return null;
  return { doseId, action: action === 'take' || action === 'snooze' ? action : null };
}

export type NotificationStatus = 'on' | 'off' | 'blocked' | 'unsupported';

/**
 * What the user should see about notifications: the saved setting only counts while
 * the browser still allows notifications (the permission can be revoked at any time).
 */
export function getNotificationStatus(enabled: boolean, permission: NotificationPermissionState): NotificationStatus {
  if (permission === 'unsupported') return 'unsupported';
  if (permission === 'denied') return 'blocked';
  return enabled && permission === 'granted' ? 'on' : 'off';
}
