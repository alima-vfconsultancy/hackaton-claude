import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Image as ImageIcon, Lightbulb, PencilLine } from 'lucide-react';
import { OcrCancelledError } from '../../application/errors';
import type { OcrJob, OcrProgress } from '../../application/ports';
import { app } from '../../composition-root';
import { Disclaimer } from '../components/Disclaimer';
import { PageHeader } from '../components/PageHeader';

/** Takes or picks a prescription photo and reads it with the on-device OCR. */
export default function CapturePage() {
  const navigate = useNavigate();
  const [isBusy, setIsBusy] = useState(false);
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const job = useRef<OcrJob | null>(null);

  useEffect(() => () => { void job.current?.cancel(); }, []);

  async function handleFile(file?: File) {
    if (!file) return;
    setError('');
    setIsBusy(true);
    setProgress({ stage: 'preparing', percent: 0 });
    try {
      const prepared = await app.imaging.prepareForOcr(file);
      setPhoto(prepared.previewDataUrl);
      job.current = app.ocr.recognize(prepared.ocrBlobs, setProgress);
      const text = await job.current.result;
      navigate('/revisar', { state: { photo: prepared.previewDataUrl, text } });
    } catch (caught) {
      if (caught instanceof OcrCancelledError) return;
      setIsBusy(false);
      setError(
        'Não consegui ler esta foto. Na primeira leitura o app precisa de internet para baixar o idioma português. Tente de novo, tire outra foto com mais luz, ou preencha manualmente (a foto fica guardada na tela seguinte).',
      );
    }
  }

  async function cancel() {
    await job.current?.cancel();
    setIsBusy(false);
    setProgress(null);
  }

  const label = progress?.stage === 'reading' ? `Lendo a receita... ${progress.percent}%` : 'Preparando a leitura...';

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Fotografar receita" back="/" />
      <Disclaimer className="mb-4" />

      {isBusy ? (
        <div className="card text-center" role="status" aria-live="polite">
          {photo && <img src={photo} alt="Foto da receita sendo lida" className="mx-auto mb-3 max-h-48 rounded-lg" />}
          <p className="text-xl font-bold">{label}</p>
          <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
            <div className="h-full bg-brand-700" style={{ width: `${progress?.stage === 'reading' ? progress.percent : 5}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted">Isso é feito no seu aparelho. Nada é enviado para a internet.</p>
          <button type="button" className="btn-ghost mt-4 w-full" onClick={cancel}>Cancelar</button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <label className="btn-primary w-full cursor-pointer !min-h-16 text-lg focus-within:outline focus-within:outline-4">
              <Camera className="h-6 w-6" aria-hidden="true" /> Abrir a câmera
              <input type="file" accept="image/*" capture="environment" className="sr-only"
                onChange={(event) => { void handleFile(event.target.files?.[0]); event.target.value = ''; }} />
            </label>
            <label className="btn-secondary w-full cursor-pointer focus-within:outline focus-within:outline-4">
              <ImageIcon className="h-5 w-5" aria-hidden="true" /> Escolher da galeria
              <input type="file" accept="image/*" className="sr-only"
                onChange={(event) => { void handleFile(event.target.files?.[0]); event.target.value = ''; }} />
            </label>
            <button type="button" className="btn-ghost w-full" onClick={() => navigate('/revisar', { state: { photo: null, text: '' } })}>
              <PencilLine className="h-5 w-5" aria-hidden="true" /> Preencher manualmente
            </button>
          </div>

          {error && <p role="alert" className="mt-4 rounded-xl border-2 border-red-600 bg-red-50 p-3 font-semibold text-red-950">{error}</p>}
          {error && photo && (
            <button type="button" className="btn-secondary mt-3 w-full" onClick={() => navigate('/revisar', { state: { photo, text: '' } })}>
              Preencher manualmente com esta foto
            </button>
          )}

          <div className="card mt-4 flex gap-3">
            <Lightbulb className="mt-1 h-6 w-6 shrink-0 text-ink" aria-hidden="true" />
            <div className="text-base">
              <p className="font-bold">Dicas para uma boa leitura</p>
              <ul className="mt-1 list-disc pl-5">
                <li>Receitas impressas funcionam melhor.</li>
                <li>Letra de mão pode exigir preenchimento manual.</li>
                <li>Coloque a receita sobre uma mesa, com boa luz, sem sombra.</li>
                <li>Enquadre só o papel e deixe o texto reto.</li>
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
