// Imported by the generated service worker (workbox importScripts).
// Contract with src/presentation/hooks/reminderNotificationLinks.ts:
// - app open: sends { type: 'reminder-click', doseId, action: 'take' | 'snooze' | '' } to the window and focuses it;
// - app closed: opens /?lembrete=<doseId>&acao=tomar|adiar (or just / when the notification itself was tapped).
// The service worker stores nothing: the app registers the dose through its use cases.
const URL_ACTIONS = { take: 'tomar', snooze: 'adiar' };

self.addEventListener('notificationclick', (event) => {
  const doseId = (event.notification.data && event.notification.data.doseId) || '';
  const action = URL_ACTIONS[event.action] ? event.action : '';
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const client = list.find((c) => 'focus' in c);
      if (client) {
        client.postMessage({ type: 'reminder-click', doseId, action });
        return client.focus();
      }
      const url = doseId && action
        ? `/?lembrete=${encodeURIComponent(doseId)}&acao=${URL_ACTIONS[action]}`
        : '/';
      return self.clients.openWindow(url);
    }),
  );
});
