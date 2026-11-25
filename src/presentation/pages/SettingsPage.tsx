import { useRef, useState } from 'react';
import { Bell, Database, Download, FlaskConical, Smartphone, Trash2, Type, Upload } from 'lucide-react';
import { BackupError } from '../../application/errors';
import { parseBackup, type BackupFile } from '../../application/backup';
import type { NotificationPermissionState } from '../../application/ports';
import { app, SAMPLE_DATA_ENABLED } from '../../composition-root';
import type { FontScale } from '../../domain/settings';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';
import { useSettings } from '../hooks/useSettings';
import { BACKUP_ERROR_MESSAGES } from '../i18n/messages';

const FONT_SCALE_OPTIONS: Array<[FontScale, string]> = [['normal', 'Normal'], ['large', 'Grande']];
const SNOOZE_OPTIONS_MINUTES = [5, 10, 15, 30, 60];

type Feedback = { kind: 'ok' | 'error'; text: string };

/** Notifications, font size, backup/restore, install help, demo data and "erase everything". */
export default function SettingsPage() {
  const settings = useSettings();
  const [permission, setPermission] = useState<NotificationPermissionState>(app.notifier.getPermission());
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pendingRestore, setPendingRestore] = useState<BackupFile | null>(null);
  const [wipeStep, setWipeStep] = useState<0 | 1 | 2>(0);
  const fileInput = useRef<HTMLInputElement>(null);

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

  async function exportBackup() {
    const backup = await app.backup.build();
    app.files.download(
      new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
      `meu-remedio-backup-${backup.exportedAt.slice(0, 10)}.json`,
    );
    showSuccess('Backup salvo. Guarde o arquivo em um lugar seguro (por exemplo, no e-mail ou na nuvem).');
  }

  async function pickBackupFile(file?: File) {
    if (!file) return;
    try {
      setPendingRestore(parseBackup(await file.text()));
    } catch (caught) {
      if (caught instanceof BackupError) showError(BACKUP_ERROR_MESSAGES[caught.code]);
      else throw caught;
    }
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
        <h2 className="flex items-center gap-2 text-xl"><Database className="h-6 w-6" aria-hidden="true" /> Backup dos dados</h2>
        <p className="mt-1 text-base">Seus dados ficam só neste aparelho. Faça um backup para não perdê-los se trocar de celular.</p>
        <div className="mt-3 grid gap-2">
          <button type="button" className="btn-primary" onClick={exportBackup}><Download className="h-5 w-5" aria-hidden="true" /> Exportar backup (JSON)</button>
          <button type="button" className="btn-secondary" onClick={() => fileInput.current?.click()}><Upload className="h-5 w-5" aria-hidden="true" /> Importar backup</button>
          <input ref={fileInput} type="file" accept="application/json,.json" className="sr-only" aria-label="Escolher arquivo de backup"
            onChange={(event) => { void pickBackupFile(event.target.files?.[0]); event.target.value = ''; }} />
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

      {SAMPLE_DATA_ENABLED && (
        <section className="card mb-4">
          <h2 className="flex items-center gap-2 text-xl"><FlaskConical className="h-6 w-6" aria-hidden="true" /> Demonstração</h2>
          <button type="button" className="btn-secondary mt-3 w-full" onClick={async () => { await app.sampleData.load(); showSuccess('Exemplo carregado. Veja na tela Hoje.'); }}>
            Carregar exemplo
          </button>
        </section>
      )}

      <section className="card mb-4 border-red-300">
        <h2 className="flex items-center gap-2 text-xl"><Trash2 className="h-6 w-6" aria-hidden="true" /> Apagar tudo</h2>
        <p className="mt-1 text-base">Remove todos os remédios, doses e configurações deste aparelho. Não dá para desfazer.</p>
        <button type="button" className="btn-danger mt-3 w-full" onClick={() => setWipeStep(1)}>Apagar todos os dados</button>
      </section>

      <ConfirmDialog open={!!pendingRestore} danger title="Importar este backup?"
        message={`Isto vai SUBSTITUIR todos os dados atuais por ${pendingRestore?.medications.length ?? 0} remédio(s) do arquivo.`}
        confirmLabel="Sim, importar" onCancel={() => setPendingRestore(null)}
        onConfirm={async () => { await app.backup.restore(pendingRestore!); setPendingRestore(null); showSuccess('Backup importado com sucesso.'); }} />
      <ConfirmDialog open={wipeStep === 1} danger title="Apagar todos os dados?"
        message="Todos os remédios e o histórico de doses serão apagados deste aparelho."
        confirmLabel="Continuar" onCancel={() => setWipeStep(0)} onConfirm={() => setWipeStep(2)} />
      <ConfirmDialog open={wipeStep === 2} danger title="Tem certeza absoluta?"
        message="Esta é a última confirmação. Depois de apagar, só um arquivo de backup pode recuperar seus dados."
        confirmLabel="Apagar tudo agora" onCancel={() => setWipeStep(0)}
        onConfirm={async () => { await app.backup.wipeAll(); setWipeStep(0); showSuccess('Todos os dados foram apagados.'); }} />
    </div>
  );
}
