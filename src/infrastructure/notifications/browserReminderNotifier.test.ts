import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REMINDER_CLICK_MESSAGE } from '../../application/reminderService';
import { buildDose, buildMedication } from '../../application/testing/inMemoryPorts';
import { createBrowserReminderNotifier } from './browserReminderNotifier';

/** Page notification (`new Notification`), as the browser builds it. */
class FakeNotification {
  static permission: NotificationPermission = 'granted';
  static created: FakeNotification[] = [];
  onclick: (() => void) | null = null;
  onclose: (() => void) | null = null;
  closed = false;
  constructor(public title: string, public options: NotificationOptions) {
    FakeNotification.created.push(this);
  }
  close() {
    this.closed = true;
    this.onclose?.();
  }
}

function stubBrowser({ registration }: { registration?: object } = {}) {
  FakeNotification.permission = 'granted';
  FakeNotification.created = [];
  const posted: unknown[] = [];
  const browserWindow = {
    focus: vi.fn(),
    location: { origin: 'https://app.local' },
    postMessage: (data: unknown) => posted.push(data),
  };
  const browserNavigator = {
    serviceWorker: { getRegistration: vi.fn(async () => registration) },
    setAppBadge: vi.fn(async () => {}),
    clearAppBadge: vi.fn(async () => {}),
  };
  const browserDocument = { title: 'Dose Certa' };
  vi.stubGlobal('Notification', FakeNotification);
  vi.stubGlobal('window', browserWindow);
  vi.stubGlobal('navigator', browserNavigator);
  vi.stubGlobal('document', browserDocument);
  return { posted, browserWindow, browserNavigator, browserDocument };
}

const dose = buildDose({ id: 'dose-1' });
const medication = buildMedication({ name: 'Dipirona' });

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => vi.unstubAllGlobals());

describe('browser reminder notifier: popup without a service worker (like WhatsApp Web)', () => {
  it('shows the notification straight from the page when no service worker is active', async () => {
    stubBrowser({ registration: undefined });

    expect(await createBrowserReminderNotifier().showDoseReminder(dose, medication)).toBe(true);

    expect(FakeNotification.created).toHaveLength(1);
    const [popup] = FakeNotification.created;
    expect(popup.title).toBe('Hora de tomar Dipirona');
    expect(popup.options).toMatchObject({ tag: 'dose-1', requireInteraction: true, lang: 'pt-BR' });
  });

  it('also uses the page when the service worker is installed but not active yet', async () => {
    stubBrowser({ registration: { active: null, showNotification: vi.fn() } });

    await createBrowserReminderNotifier().showDoseReminder(dose, medication);

    expect(FakeNotification.created).toHaveLength(1);
  });

  it('focuses the app and asks it to open Hoje when the popup is clicked', async () => {
    const { posted, browserWindow } = stubBrowser();
    await createBrowserReminderNotifier().showDoseReminder(dose, medication);
    const [popup] = FakeNotification.created;

    popup.onclick?.();

    expect(browserWindow.focus).toHaveBeenCalled();
    expect(popup.closed).toBe(true);
    expect(posted).toEqual([{ type: REMINDER_CLICK_MESSAGE, doseId: 'dose-1', action: '' }]);
  });

  it('closes the popup when the dose is registered in the app', async () => {
    stubBrowser();
    const notifier = createBrowserReminderNotifier();
    await notifier.showDoseReminder(dose, medication);

    await notifier.dismissDoseReminder('dose-1');

    expect(FakeNotification.created[0].closed).toBe(true);
  });

  it('shows nothing without permission', async () => {
    stubBrowser();
    FakeNotification.permission = 'default';

    expect(await createBrowserReminderNotifier().showDoseReminder(dose, medication)).toBe(false);
    expect(FakeNotification.created).toEqual([]);
  });
});

describe('browser reminder notifier: with an active service worker', () => {
  it('shows the notification through the service worker, with the Tomei and Adiar buttons', async () => {
    const showNotification = vi.fn(async () => {});
    stubBrowser({ registration: { active: {}, showNotification } });

    expect(await createBrowserReminderNotifier().showDoseReminder(dose, medication)).toBe(true);

    expect(FakeNotification.created).toEqual([]);
    expect(showNotification).toHaveBeenCalledWith(
      'Hora de tomar Dipirona',
      expect.objectContaining({
        tag: 'dose-1',
        data: { doseId: 'dose-1' },
        actions: [{ action: 'take', title: 'Tomei' }, { action: 'snooze', title: 'Adiar' }],
      }),
    );
  });
});

describe('browser reminder notifier: counter like a chat app', () => {
  it('shows the number of due doses on the tab title and the app icon', () => {
    const { browserDocument, browserNavigator } = stubBrowser();
    const notifier = createBrowserReminderNotifier();

    notifier.showPendingCount(2);
    expect(browserDocument.title).toBe('(2) Dose Certa');
    expect(browserNavigator.setAppBadge).toHaveBeenCalledWith(2);

    notifier.showPendingCount(0);
    expect(browserDocument.title).toBe('Dose Certa');
    expect(browserNavigator.clearAppBadge).toHaveBeenCalled();
  });
});
