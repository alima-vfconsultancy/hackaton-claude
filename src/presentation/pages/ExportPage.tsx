import { useState } from 'react';
import { subDays } from 'date-fns';
import { Download, Share2 } from 'lucide-react';
import type { GeneratedPdf } from '../../application/ports';
import { app } from '../../composition-root';
import type { TreatmentFilter } from '../../domain/adherence';
import { formatLocalDate } from '../../domain/time';
import { Disclaimer } from '../components/Disclaimer';
import { PageHeader } from '../components/PageHeader';

const pdfFileName = (from: string, to: string) => `dose-certa-${from}-a-${to}.pdf`;

/** Generates the PDF history of the chosen period, to download or share. */
export default function ExportPage() {
  const today = formatLocalDate(new Date());
  const [from, setFrom] = useState(formatLocalDate(subDays(new Date(), 30)));
  const [to, setTo] = useState(today);
  const [filter, setFilter] = useState<TreatmentFilter>('all');
  const [includeDoses, setIncludeDoses] = useState(true);
  const [message, setMessage] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;

  async function generate(): Promise<GeneratedPdf | null> {
    setMessage('');
    if (!from || !to || from > to) {
      setMessage('Escolha um período válido: a data inicial deve ser igual ou anterior à final.');
      return null;
    }
    return app.reports.generatePdf({ from, to, filter, includeDoses });
  }

  async function download() {
    setIsBusy(true);
    try {
      const pdf = await generate();
      if (pdf) { pdf.save(pdfFileName(from, to)); setMessage('PDF gerado. Procure na pasta de downloads.'); }
    } catch {
      setMessage('Não foi possível gerar o PDF. Tente de novo.');
    } finally { setIsBusy(false); }
  }

  async function share() {
    setIsBusy(true);
    try {
      const pdf = await generate();
      if (!pdf) return;
      const file = new File([pdf.toBlob()], pdfFileName(from, to), { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Histórico de medicamentos' });
      } else {
        pdf.save(pdfFileName(from, to));
        setMessage('Seu aparelho não permite compartilhar arquivos. O PDF foi baixado.');
      }
    } catch (caught) {
      if ((caught as Error).name !== 'AbortError') setMessage('Não foi possível compartilhar. Use o botão "Baixar PDF".');
    } finally { setIsBusy(false); }
  }

  const filterOption = (value: TreatmentFilter, label: string) => (
    <label className="flex min-h-12 items-center gap-3 text-base">
      <input type="radio" name="treatment-filter" className="h-6 w-6" checked={filter === value} onChange={() => setFilter(value)} /> {label}
    </label>
  );

  return (
    <div>
      <PageHeader title="Exportar PDF" />
      <p className="mb-4 text-base">Gere um PDF do seu histórico para imprimir ou mostrar ao médico.</p>

      <div className="card space-y-4">
        <div className="grid gap-3">
          <div>
            <label htmlFor="pdf-from" className="field-label">De</label>
            <input id="pdf-from" type="date" className="field" value={from} max={to} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div>
            <label htmlFor="pdf-to" className="field-label">Até</label>
            <input id="pdf-to" type="date" className="field" value={to} min={from} onChange={(event) => setTo(event.target.value)} />
          </div>
        </div>
        <fieldset>
          <legend className="field-label">Quais remédios?</legend>
          {filterOption('current', 'Atuais (em uso)')}
          {filterOption('past', 'Passados (encerrados)')}
          {filterOption('all', 'Todos')}
        </fieldset>
        <label className="flex min-h-12 items-center gap-3 text-base font-semibold">
          <input type="checkbox" className="h-6 w-6" checked={includeDoses} onChange={(event) => setIncludeDoses(event.target.checked)} />
          Incluir o registro de doses
        </label>
      </div>

      {message && <p role="status" className="mt-4 rounded-xl border-2 border-brand-700 bg-mint p-3 font-semibold">{message}</p>}

      <div className="mt-4 space-y-3">
        <button type="button" disabled={isBusy} className="btn-primary w-full !min-h-14 text-lg" onClick={download}>
          <Download className="h-6 w-6" aria-hidden="true" /> Baixar PDF
        </button>
        {canShare && (
          <button type="button" disabled={isBusy} className="btn-secondary w-full" onClick={share}>
            <Share2 className="h-5 w-5" aria-hidden="true" /> Compartilhar
          </button>
        )}
      </div>
      <Disclaimer className="mt-4" />
    </div>
  );
}
