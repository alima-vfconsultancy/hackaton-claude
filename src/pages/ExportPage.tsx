import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { Download, Share2 } from 'lucide-react';
import { db } from '../db/db';
import { PageHeader } from '../components/PageHeader';
import { Disclaimer } from '../components/Disclaimer';
import type { MedFilter } from '../lib/adherence';

const pdfFileName = (from: string, to: string) => `meu-remedio-${from}-a-${to}.pdf`;

export default function ExportPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [from, setFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [to, setTo] = useState(today);
  const [filter, setFilter] = useState<MedFilter>('all');
  const [includeDoses, setIncludeDoses] = useState(true);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;

  async function make() {
    setMsg('');
    if (!from || !to || from > to) {
      setMsg('Escolha um período válido: a data inicial deve ser igual ou anterior à final.');
      return null;
    }
    const [meds, doses] = await Promise.all([db.medications.toArray(), db.doseLogs.toArray()]);
    const { buildPdf } = await import('../lib/pdf');
    return buildPdf({ meds, doses, from, to, filter, includeDoses });
  }

  async function download() {
    setBusy(true);
    try {
      const doc = await make();
      if (doc) { doc.save(pdfFileName(from, to)); setMsg('PDF gerado. Procure na pasta de downloads.'); }
    } catch {
      setMsg('Não foi possível gerar o PDF. Tente de novo.');
    } finally { setBusy(false); }
  }

  async function share() {
    setBusy(true);
    try {
      const doc = await make();
      if (!doc) return;
      const file = new File([doc.output('blob')], pdfFileName(from, to), { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Histórico de medicamentos' });
      } else {
        doc.save(pdfFileName(from, to));
        setMsg('Seu aparelho não permite compartilhar arquivos. O PDF foi baixado.');
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setMsg('Não foi possível compartilhar. Use o botão "Baixar PDF".');
    } finally { setBusy(false); }
  }

  const radio = (v: MedFilter, label: string) => (
    <label className="flex min-h-12 items-center gap-3 text-base">
      <input type="radio" name="filtro" className="h-6 w-6" checked={filter === v} onChange={() => setFilter(v)} /> {label}
    </label>
  );

  return (
    <div>
      <PageHeader title="Exportar PDF" />
      <p className="mb-4 text-base">Gere um PDF do seu histórico para imprimir ou mostrar ao médico.</p>

      <div className="card space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="pdf-de" className="field-label">De</label>
            <input id="pdf-de" type="date" className="field" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label htmlFor="pdf-ate" className="field-label">Até</label>
            <input id="pdf-ate" type="date" className="field" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <fieldset>
          <legend className="field-label">Quais remédios?</legend>
          {radio('current', 'Atuais (em uso)')}
          {radio('past', 'Passados (encerrados)')}
          {radio('all', 'Todos')}
        </fieldset>
        <label className="flex min-h-12 items-center gap-3 text-base font-semibold">
          <input type="checkbox" className="h-6 w-6" checked={includeDoses} onChange={(e) => setIncludeDoses(e.target.checked)} />
          Incluir o registro de doses
        </label>
      </div>

      {msg && <p role="status" className="mt-4 rounded-xl border-2 border-brand-700 bg-brand-50 p-3 font-semibold">{msg}</p>}

      <div className="mt-4 space-y-3">
        <button type="button" disabled={busy} className="btn-primary w-full !min-h-14 text-lg" onClick={download}>
          <Download className="h-6 w-6" aria-hidden="true" /> Baixar PDF
        </button>
        {canShare && (
          <button type="button" disabled={busy} className="btn-secondary w-full" onClick={share}>
            <Share2 className="h-5 w-5" aria-hidden="true" /> Compartilhar
          </button>
        )}
      </div>
      <Disclaimer className="mt-4" />
    </div>
  );
}
