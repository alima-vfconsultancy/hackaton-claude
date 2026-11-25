import { useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CheckCheck, Plus, Trash2 } from 'lucide-react';
import { MedicationForm, type FieldFlags } from '../components/MedicationForm';
import { PageHeader } from '../components/PageHeader';
import { Disclaimer } from '../components/Disclaimer';
import { parsePrescription, suggestionToInput } from '../lib/prescriptionParser';
import { emptyMedication, validateMedication } from '../lib/medicationDefaults';
import { makeThumbnail } from '../lib/imagePreprocess';
import { createMedications } from '../db/repo';
import type { MedicationInput } from '../types';

interface Item {
  key: number;
  input: MedicationInput;
  flags: FieldFlags;
}
interface ReviewState {
  photo: string | null;
  text: string;
}

export default function ReviewPage() {
  const nav = useNavigate();
  const state = useLocation().state as ReviewState | null;

  const parsed = useMemo<Item[]>(() => {
    if (!state) return [];
    const today = format(new Date(), 'yyyy-MM-dd');
    return parsePrescription(state.text).map((s, i) => ({
      key: i,
      input: suggestionToInput(s, today, state.text),
      flags: {
        name: s.confidence.name === 'baixa',
        dosage: s.confidence.dosage === 'baixa',
        schedule: s.confidence.schedule === 'baixa',
        duration: s.confidence.duration === 'baixa',
      },
    }));
  }, [state]);
  const nothingDetected = parsed.length === 0;
  const initial = useMemo<Item[]>(
    () => (parsed.length || !state ? parsed : [{ key: 0, input: { ...emptyMedication(), ocrRawText: state.text || undefined }, flags: {} }]),
    [parsed, state],
  );

  const [items, setItems] = useState<Item[]>(initial);
  const [nextKey, setNextKey] = useState(initial.length);
  const [keepPhoto, setKeepPhoto] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  if (!state) return <Navigate to="/fotografar" replace />;

  const add = () => {
    setItems((l) => [...l, { key: nextKey, input: { ...emptyMedication(), ocrRawText: state.text }, flags: {} }]);
    setNextKey((k) => k + 1);
  };

  async function confirm() {
    const errs = items.flatMap((it, i) => validateMedication(it.input).map((e) => `Remédio ${i + 1}: ${e}`));
    if (items.length === 0) errs.push('Adicione pelo menos um remédio ou volte para a tela inicial.');
    setErrors(errs);
    if (errs.length) { window.scrollTo({ top: 0 }); return; }
    setSaving(true);
    // Somente aqui, após a confirmação do usuário, algo é gravado.
    const thumb = keepPhoto && state!.photo ? await makeThumbnail(state!.photo) : undefined;
    await createMedications(items.map((i) => i.input), thumb);
    nav('/', { replace: true });
  }

  return (
    <div>
      <PageHeader title="Confira a leitura" back="/fotografar" />
      <Disclaimer className="mb-4" />

      <p className="mb-4 text-base">
        {nothingDetected
          ? 'Não consegui identificar remédios nesta receita. Você pode preencher manualmente, sem perder a foto.'
          : 'O app tentou ler sua receita. Confira cada campo com a receita. Campos em amarelo estão incertos. Nada é salvo até você confirmar.'}
      </p>

      {state.photo && (
        <details className="card mb-4" open>
          <summary className="min-h-12 cursor-pointer py-2 text-lg font-bold">Foto da receita</summary>
          <img src={state.photo} alt="Foto da receita" className="mt-2 w-full rounded-lg border border-slate-300" />
        </details>
      )}
      {state.text.trim() && (
        <details className="card mb-4">
          <summary className="min-h-12 cursor-pointer py-2 text-lg font-bold">Texto lido da foto</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words text-sm">{state.text}</pre>
        </details>
      )}

      {errors.length > 0 && (
        <div role="alert" className="mb-4 rounded-xl border-2 border-red-600 bg-red-50 p-3 text-red-950">
          <p className="font-bold">Falta pouco! Corrija:</p>
          <ul className="list-disc pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <div className="space-y-6">
        {items.map((it, idx) => (
          <section key={it.key} className="card" aria-label={`Remédio ${idx + 1}`}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold">Remédio {idx + 1}</h2>
              <button type="button" className="btn-ghost !min-h-10 text-red-800"
                onClick={() => setItems((l) => l.filter((x) => x.key !== it.key))}>
                <Trash2 className="h-5 w-5" aria-hidden="true" /> Remover
              </button>
            </div>
            <MedicationForm value={it.input} flags={it.flags}
              onChange={(v) => setItems((l) => l.map((x) => (x.key === it.key ? { ...x, input: v } : x)))} />
          </section>
        ))}
      </div>

      <button type="button" className="btn-secondary mt-4 w-full" onClick={add}>
        <Plus className="h-5 w-5" aria-hidden="true" /> Adicionar outro remédio
      </button>

      {state.photo && (
        <label className="mt-4 flex min-h-12 items-center gap-3 text-base font-semibold">
          <input type="checkbox" className="h-6 w-6" checked={keepPhoto} onChange={(e) => setKeepPhoto(e.target.checked)} />
          Guardar foto da receita
        </label>
      )}
      {keepPhoto && <p className="text-sm text-slate-700">Será guardada uma miniatura pequena, só neste aparelho.</p>}

      <button type="button" disabled={saving} className="btn-primary mt-6 w-full !min-h-14 text-lg" onClick={confirm}>
        <CheckCheck className="h-6 w-6" aria-hidden="true" /> Confirmar e criar lembretes
      </button>
    </div>
  );
}
