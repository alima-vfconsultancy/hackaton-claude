import { useRef, useState } from 'react';
import { Bell, Database, Download, FlaskConical, Smartphone, Trash2, Type, Upload } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useSettings } from '../hooks/useSettings';
import { saveSettings } from '../db/repo';
import { notificationsSupported, permissionState, requestPermission } from '../lib/notifications';
import { buildBackup, parseBackup, restoreBackup, wipeAll, type BackupFile } from '../lib/backup';
import { downloadBlob } from '../lib/download';
import { loadSampleData, SAMPLE_ENABLED } from '../lib/sampleData';

export default function SettingsPage() {
  const s = useSettings();
  const [perm, setPerm] = useState(permissionState());
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [pendingRestore, setPendingRestore] = useState<BackupFile | null>(null);
  const [wipeStep, setWipeStep] = useState<0 | 1 | 2>(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const ok = (text: string) => setMsg({ kind: 'ok', text });
  const err = (text: string) => setMsg({ kind: 'err', text });

  async function toggleNotifications() {
    if (s.notificationsEnabled) { await saveSettings({ notificationsEnabled: false }); return; }
    const p = await requestPermission();
    setPerm(p);
    if (p === 'granted') { await saveSettings({ notificationsEnabled: true }); ok('Notificações ativadas.'); }
    else if (p === 'unsupported') err('Este navegador não permite notificações. Use também a opção "Adicionar lembretes ao calendário" em cada remédio.');
    else err('As notificações foram bloqueadas. Para ativar, abra as configurações do navegador, permita notificações para este app e tente de novo.');
  }

  async function exportJson() {
    const b = await buildBackup();
    downloadBlob(new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' }), `meu-remedio-backup-${b.exportedAt.slice(0, 10)}.json`);
    ok('Backup salvo. Guarde o arquivo em um lugar seguro (por exemplo, no e-mail ou na nuvem).');
  }

  async function pickFile(f?: File) {
    if (!f) return;
    try {
      setPendingRestore(parseBackup(await f.text()));
    } catch (e) {
      err((e as Error).message);
    }
  }

  return (
    <div>
      <PageHeader title="Ajustes" />
      {msg && (
        <p role={msg.kind === 'err' ? 'alert' : 'status'}
          className={`mb-4 rounded-xl border-2 p-3 font-semibold ${msg.kind === 'err' ? 'border-red-600 bg-red-50 text-red-950' : 'border-green-700 bg-green-50 text-green-950'}`}>
          {msg.text}
        </p>
      )}

      <section className="card mb-4">
        <h2 className="flex items-center gap-2 text-xl font-bold"><Bell className="h-6 w-6" aria-hidden="true" /> Notificações</h2>
        <p className="mt-1 text-base">
          Para avisar você na hora de tomar o remédio, o app precisa da sua permissão para mostrar avisos. Os avisos aparecem enquanto o app está aberto ou foi usado há pouco.
          Para lembretes garantidos com o app fechado, use "Adicionar lembretes ao calendário" dentro de cada remédio.
        </p>
        {!notificationsSupported() && <p className="mt-2 text-base font-semibold">Este navegador não oferece notificações.</p>}
        <button type="button" role="switch" aria-checked={s.notificationsEnabled} className={s.notificationsEnabled ? 'btn-ghost mt-3 w-full' : 'btn-primary mt-3 w-full'}
          onClick={toggleNotifications} disabled={!notificationsSupported()}>
          {s.notificationsEnabled ? 'Desativar notificações' : 'Ativar notificações'}
        </button>
        {perm === 'denied' && <p className="mt-2 text-sm font-semibold text-red-900">As notificações estão bloqueadas no navegador.</p>}
        <div className="mt-4">
          <label htmlFor="snooze" className="field-label">Adiar por quantos minutos?</label>
          <select id="snooze" className="field" value={s.snoozeMinutes} onChange={(e) => saveSettings({ snoozeMinutes: Number(e.target.value) })}>
            {[5, 10, 15, 30, 60].map((n) => <option key={n} value={n}>{n} minutos</option>)}
          </select>
        </div>
      </section>

      <section className="card mb-4">
        <h2 className="flex items-center gap-2 text-xl font-bold"><Type className="h-6 w-6" aria-hidden="true" /> Tamanho da letra</h2>
        <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tamanho da letra">
          {([['normal', 'Normal'], ['grande', 'Grande']] as const).map(([k, label]) => (
            <button key={k} type="button" role="radio" aria-checked={s.fontScale === k} onClick={() => saveSettings({ fontScale: k })}
              className={`btn ${s.fontScale === k ? 'bg-brand-700 text-white' : 'border-2 border-slate-400 bg-white text-slate-900'}`}>
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="card mb-4">
        <h2 className="flex items-center gap-2 text-xl font-bold"><Database className="h-6 w-6" aria-hidden="true" /> Backup dos dados</h2>
        <p className="mt-1 text-base">Seus dados ficam só neste aparelho. Faça um backup para não perdê-los se trocar de celular.</p>
        <div className="mt-3 grid gap-2">
          <button type="button" className="btn-primary" onClick={exportJson}><Download className="h-5 w-5" aria-hidden="true" /> Exportar backup (JSON)</button>
          <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}><Upload className="h-5 w-5" aria-hidden="true" /> Importar backup</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Escolher arquivo de backup"
            onChange={(e) => { void pickFile(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
      </section>

      <section className="card mb-4">
        <h2 className="flex items-center gap-2 text-xl font-bold"><Smartphone className="h-6 w-6" aria-hidden="true" /> Instalar na tela inicial</h2>
        <details className="mt-2">
          <summary className="min-h-12 cursor-pointer py-2 text-base font-bold">Android (Chrome)</summary>
          <ol className="list-decimal space-y-1 pl-6 text-base">
            <li>Toque nos três pontinhos (⋮) no canto do Chrome.</li>
            <li>Toque em "Instalar app" ou "Adicionar à tela inicial".</li>
            <li>Confirme. O ícone do MeuRemédio aparece na tela inicial.</li>
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

      {SAMPLE_ENABLED && (
        <section className="card mb-4">
          <h2 className="flex items-center gap-2 text-xl font-bold"><FlaskConical className="h-6 w-6" aria-hidden="true" /> Demonstração</h2>
          <button type="button" className="btn-secondary mt-3 w-full" onClick={async () => { await loadSampleData(); ok('Exemplo carregado. Veja na tela Hoje.'); }}>
            Carregar exemplo
          </button>
        </section>
      )}

      <section className="card mb-4 border-red-300">
        <h2 className="flex items-center gap-2 text-xl font-bold"><Trash2 className="h-6 w-6" aria-hidden="true" /> Apagar tudo</h2>
        <p className="mt-1 text-base">Remove todos os remédios, doses e configurações deste aparelho. Não dá para desfazer.</p>
        <button type="button" className="btn-danger mt-3 w-full" onClick={() => setWipeStep(1)}>Apagar todos os dados</button>
      </section>

      <ConfirmDialog open={!!pendingRestore} danger title="Importar este backup?"
        message={`Isto vai SUBSTITUIR todos os dados atuais por ${pendingRestore?.medications.length ?? 0} remédio(s) do arquivo.`}
        confirmLabel="Sim, importar" onCancel={() => setPendingRestore(null)}
        onConfirm={async () => { await restoreBackup(pendingRestore!); setPendingRestore(null); ok('Backup importado com sucesso.'); }} />
      <ConfirmDialog open={wipeStep === 1} danger title="Apagar todos os dados?"
        message="Todos os remédios e o histórico de doses serão apagados deste aparelho."
        confirmLabel="Continuar" onCancel={() => setWipeStep(0)} onConfirm={() => setWipeStep(2)} />
      <ConfirmDialog open={wipeStep === 2} danger title="Tem certeza absoluta?"
        message="Esta é a última confirmação. Depois de apagar, só um arquivo de backup pode recuperar seus dados."
        confirmLabel="Apagar tudo agora" onCancel={() => setWipeStep(0)}
        onConfirm={async () => { await wipeAll(); setWipeStep(0); ok('Todos os dados foram apagados.'); }} />
    </div>
  );
}
