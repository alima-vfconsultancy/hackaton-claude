import { useState } from 'react';
import { Bell, Smartphone, Type } from 'lucide-react';
import type { NotificationPermissionState } from '../../application/ports';
import { app } from '../../composition-root';
import type { FontScale } from '../../domain/settings';
import { PageHeader } from '../components/PageHeader';
import { useSettings } from '../hooks/useSettings';

const FONT_SCALE_OPTIONS: Array<[FontScale, string]> = [['normal', 'Normal'], ['large', 'Grande']];
const SNOOZE_OPTIONS_MINUTES = [5, 10, 15, 30, 60];

type Feedback = { kind: 'ok' | 'error'; text: string };

/** Notifications, font size and install help. */
export default function SettingsPage() {
  const settings = useSettings();
  const [permission, setPermission] = useState<NotificationPermissionState>(app.notifier.getPermission());
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const showSuccess = (text: string) => setFeedback({ kind: 'ok', text });
  const showError = (text: string) => setFeedback({ kind: 'error', text });

  async function toggleNotifications() {
    if (settings.notificationsEnabled) { await app.settings.save({ notificationsEnabled: false }); return; }
    const result = await app.notifier.requestPermission();
    setPermission(result);
    if (result === 'granted') { await app.settings.save({ notificationsEnabled: true }); showSuccess('Notificações ativadas.'); }
    else if (result === 'unsupported') showError('Este navegador não permite notificações. Use também a opção "Adicionar lembretes ao calendário" em cada remédio.');
    else showError('As notificações foram bloqueadas. Para ativar, abra as configurações do navegador, permita notificações para este app e tente de novo.');
  }

  return (
    <div>
      <PageHeader title="Ajustes" />
      {feedback && (
        <p role={feedback.kind === 'error' ? 'alert' : 'status'}
          className={`mb-4 rounded-xl border-2 p-3 font-semibold ${feedback.kind === 'error' ? 'border-red-600 bg-red-50 text-red-950' : 'border-green-700 bg-green-50 text-green-950'}`}>
          {feedback.text}
        </p>
      )}

      <section className="card mb-4">
        <h2 className="flex items-center gap-2 text-xl"><Bell className="h-6 w-6" aria-hidden="true" /> Notificações</h2>
        <p className="mt-1 text-base">
          Para avisar você na hora de tomar o remédio, o app precisa da sua permissão para mostrar avisos. Os avisos aparecem enquanto o app está aberto ou foi usado há pouco.
          Para lembretes garantidos com o app fechado, use "Adicionar lembretes ao calendário" dentro de cada remédio.
        </p>
        {!app.notifier.isSupported() && <p className="mt-2 text-base font-semibold">Este navegador não oferece notificações.</p>}
        <button type="button" role="switch" aria-checked={settings.notificationsEnabled}
          className={settings.notificationsEnabled ? 'btn-ghost mt-3 w-full' : 'btn-primary mt-3 w-full'}
          onClick={toggleNotifications} disabled={!app.notifier.isSupported()}>
          {settings.notificationsEnabled ? 'Desativar notificações' : 'Ativar notificações'}
        </button>
        {permission === 'denied' && <p className="mt-2 text-sm font-semibold text-red-900">As notificações estão bloqueadas no navegador.</p>}
        <div className="mt-4">
          <label htmlFor="snooze-minutes" className="field-label">Adiar por quantos minutos?</label>
          <select id="snooze-minutes" className="field" value={settings.snoozeMinutes}
            onChange={(event) => app.settings.save({ snoozeMinutes: Number(event.target.value) })}>
            {SNOOZE_OPTIONS_MINUTES.map((minutes) => <option key={minutes} value={minutes}>{minutes} minutos</option>)}
          </select>
        </div>
      </section>

      <section className="card mb-4">
        <h2 className="flex items-center gap-2 text-xl"><Type className="h-6 w-6" aria-hidden="true" /> Tamanho da letra</h2>
        <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tamanho da letra">
          {FONT_SCALE_OPTIONS.map(([scale, label]) => (
            <button key={scale} type="button" role="radio" aria-checked={settings.fontScale === scale} onClick={() => app.settings.save({ fontScale: scale })}
              className={`btn ${settings.fontScale === scale ? 'bg-brand-700 text-white' : 'border-2 border-slate-400 bg-white text-ink'}`}>
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="card mb-4">
        <h2 className="flex items-center gap-2 text-xl"><Smartphone className="h-6 w-6" aria-hidden="true" /> Instalar na tela inicial</h2>
        <details className="mt-2">
          <summary className="min-h-12 cursor-pointer py-2 text-base font-bold">Android (Chrome)</summary>
          <ol className="list-decimal space-y-1 pl-6 text-base">
            <li>Toque nos três pontinhos (⋮) no canto do Chrome.</li>
            <li>Toque em "Instalar app" ou "Adicionar à tela inicial".</li>
            <li>Confirme. O ícone do Dose Certa aparece na tela inicial.</li>
          </ol>
        </details>
        <details className="mt-1">
          <summary className="min-h-12 cursor-pointer py-2 text-base font-bold">iPhone (Safari)</summary>
          <ol className="list-decimal space-y-1 pl-6 text-base">
            <li>Abra este endereço no Safari (não funciona em outros navegadores).</li>
            <li>Toque no botão Compartilhar (quadrado com seta para cima).</li>
            <li>Escolha "Adicionar à Tela de Início".</li>
            <li>Toque em "Adicionar".</li>
          </ol>
        </details>
      </section>
    </div>
  );
}
