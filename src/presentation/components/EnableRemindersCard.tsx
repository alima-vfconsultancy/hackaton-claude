import { useState } from 'react';
import { BellRing } from 'lucide-react';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { NOTIFICATION_PERMISSION_MESSAGES } from '../i18n/messages';

/**
 * Invites the user to turn on the dose reminders, right on the Hoje screen.
 * Shown only while they are off and the browser can still ask for permission.
 */
export function EnableRemindersCard() {
  const notifications = useNotificationSettings();
  const [error, setError] = useState('');

  if (notifications.status !== 'off') return null;

  async function enable() {
    const result = await notifications.enable();
    setError(result === 'granted' ? '' : NOTIFICATION_PERMISSION_MESSAGES[result]);
  }

  return (
    <section aria-labelledby="enable-reminders-title" className="mb-4 rounded-xl border-2 border-accent-600 bg-accent-100 p-3 text-ink">
      <h2 id="enable-reminders-title" className="flex items-center gap-2 text-lg">
        <BellRing className="h-6 w-6 shrink-0" aria-hidden="true" /> Avisos na hora do remédio
      </h2>
      <p className="mt-1 text-base">
        Ative os avisos para o celular lembrar você na hora de cada dose. Pelo próprio aviso você toca em "Tomei" ou "Adiar".
      </p>
      <button type="button" className="btn-primary mt-3 w-full" onClick={enable}>
        Ativar avisos
      </button>
      {error && <p role="alert" className="mt-2 text-base font-semibold text-red-900">{error}</p>}
    </section>
  );
}
