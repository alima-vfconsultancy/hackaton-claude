import { describe, expect, it } from 'vitest';
import { getNotificationStatus, parseReminderLink, parseReminderMessage } from './reminderNotificationLinks';

describe('parseReminderLink', () => {
  it.each([
    ['?lembrete=dose-1&acao=tomar', { doseId: 'dose-1', action: 'take' }],
    ['?lembrete=dose-1&acao=adiar', { doseId: 'dose-1', action: 'snooze' }],
    ['?acao=tomar&lembrete=a%20b', { doseId: 'a b', action: 'take' }],
  ])('reads the button tapped on the notification from %s', (search, expected) => {
    expect(parseReminderLink(search)).toEqual(expected);
  });

  it.each(['', '?lembrete=dose-1', '?acao=tomar', '?lembrete=&acao=tomar', '?lembrete=dose-1&acao=apagar', '?outra=1'])(
    'ignores %s',
    (search) => {
      expect(parseReminderLink(search)).toBeNull();
    },
  );
});

describe('parseReminderMessage', () => {
  it('reads a button message sent by the service worker', () => {
    expect(parseReminderMessage({ type: 'reminder-click', doseId: 'dose-1', action: 'take' })).toEqual({ doseId: 'dose-1', action: 'take' });
    expect(parseReminderMessage({ type: 'reminder-click', doseId: 'dose-1', action: 'snooze' })).toEqual({ doseId: 'dose-1', action: 'snooze' });
  });

  it('reads a tap on the notification body as "open Hoje" without an action', () => {
    expect(parseReminderMessage({ type: 'reminder-click', doseId: 'dose-1', action: '' })).toEqual({ doseId: 'dose-1', action: null });
  });

  it.each([null, 'reminder-click', { type: 'other' }, { type: 'reminder-click', action: 'take' }, { type: 'reminder-click', doseId: 1, action: 'take' }])(
    'ignores unrelated messages: %j',
    (data) => {
      expect(parseReminderMessage(data)).toBeNull();
    },
  );
});

describe('getNotificationStatus', () => {
  it('is "on" only when the setting is on and the browser allows notifications', () => {
    expect(getNotificationStatus(true, 'granted')).toBe('on');
    expect(getNotificationStatus(false, 'granted')).toBe('off');
    expect(getNotificationStatus(true, 'default')).toBe('off');
  });

  it('is "blocked" when the browser denied the permission, even if the setting is on', () => {
    expect(getNotificationStatus(true, 'denied')).toBe('blocked');
    expect(getNotificationStatus(false, 'denied')).toBe('blocked');
  });

  it('is "unsupported" when the browser has no notifications', () => {
    expect(getNotificationStatus(true, 'unsupported')).toBe('unsupported');
  });
});
