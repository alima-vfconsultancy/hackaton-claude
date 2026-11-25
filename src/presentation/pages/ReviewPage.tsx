import { useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCheck, Plus, Trash2 } from 'lucide-react';
import { parsePrescription, suggestionToDraft } from '../../application/prescriptionParser';
import { app } from '../../composition-root';
import { formatLocalDate } from '../../domain/time';
import { Disclaimer } from '../components/Disclaimer';
import { MedicationForm, type FieldFlags } from '../components/MedicationForm';
import { PageHeader } from '../components/PageHeader';
import { buildMedicationDraft, createEmptyFormValues, medicationToFormValues, type MedicationFormValues } from '../forms/medicationFormValues';
import {
  ALL_REQUIRED_FIELDS, clearUnreadValues, detectUnreadFields, findEmptyRequiredFields, type RequiredFieldFlags,
} from '../forms/missingRequiredFields';
import { MEDICATION_ISSUE_MESSAGES } from '../i18n/messages';

interface ReviewItem {
  key: number;
  values: MedicationFormValues;
  flags: FieldFlags;
  /** Required fields the reading did not return: they start empty and highlighted. */
  unread: RequiredFieldFlags;
}

/** Navigation state coming from the capture screen. */
interface ReviewState {
  photo: string | null;
  text: string;
}

/**
 * Review screen: the user checks and edits everything the OCR suggested.
 * Nothing is saved until "Confirmar e criar lembretes" is pressed (safety rule #1).
 */
export default function ReviewPage() {
  const navigate = useNavigate();
  const state = useLocation().state as ReviewState | null;

  const suggested = useMemo<ReviewItem[]>(() => {
    if (!state) return [];
    const today = formatLocalDate(new Date());
    return parsePrescription(state.text).map((suggestion, index) => {
      // Only the form layer reacts to what is missing; the parser output is used as it is.
      const unread = detectUnreadFields(suggestion);
      return {
        key: index,
        values: clearUnreadValues(medicationToFormValues(suggestionToDraft(suggestion, today, state.text)), unread),
        flags: {
          name: suggestion.confidence.name === 'low',
          dosage: suggestion.confidence.dosage === 'low',
          schedule: suggestion.confidence.schedule === 'low',
          duration: suggestion.confidence.duration === 'low',
        },
        unread,
      };
    });
  }, [state]);
  const nothingDetected = suggested.length === 0;
  const initialItems = useMemo<ReviewItem[]>(
    () => (suggested.length || !state
      ? suggested
      : [{
          key: 0,
          values: clearUnreadValues({ ...createEmptyFormValues(), sourceOcrText: state.text || undefined }, ALL_REQUIRED_FIELDS),
          flags: {},
          unread: ALL_REQUIRED_FIELDS,
        }]),
    [suggested, state],
  );

  const [items, setItems] = useState<ReviewItem[]>(initialItems);
  const [nextKey, setNextKey] = useState(initialItems.length);
  const [keepPhoto, setKeepPhoto] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!state) return <Navigate to="/fotografar" replace />;

  const addItem = () => {
    setItems((list) => [...list, { key: nextKey, values: { ...createEmptyFormValues(), sourceOcrText: state.text }, flags: {}, unread: {} }]);
    setNextKey((key) => key + 1);
  };

  // The notice goes away once the user fills in everything the reading did not return.
  const hasUnreadFields = items.some((item) => {
    const empty = findEmptyRequiredFields(item.values);
    return (Object.keys(item.unread) as Array<keyof RequiredFieldFlags>).some((field) => item.unread[field] && empty[field]);
  });

  async function confirm() {
    setIsSubmitted(true);
    const built = items.map((item) => buildMedicationDraft(item.values));
    const messages = built.flatMap(({ issues }, index) => issues.map((code) => `Remédio ${index + 1}: ${MEDICATION_ISSUE_MESSAGES[code]}`));
    if (items.length === 0) messages.push('Adicione pelo menos um remédio ou volte para a tela inicial.');
    setErrors(messages);
    if (messages.length) { window.scrollTo({ top: 0 }); return; }
    setIsSaving(true);
    // Only here, after the user's confirmation, something is stored.
    const thumbnail = keepPhoto && state!.photo ? await app.imaging.createThumbnail(state!.photo) : undefined;
    await app.medications.create(built.map(({ draft }) => draft), thumbnail);
    navigate('/', { replace: true });
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
      {hasUnreadFields && (
        <p className="mb-4 flex items-start gap-2 rounded-xl border-2 border-red-700 bg-red-50 p-3 text-base font-semibold text-red-950">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <span>Algumas informações obrigatórias não foram encontradas na receita. Preencha os campos em vermelho para continuar.</span>
        </p>
      )}

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
          <ul className="list-disc pl-5">{errors.map((message) => <li key={message}>{message}</li>)}</ul>
        </div>
      )}

      <div className="space-y-6">
        {items.map((item, index) => (
          <section key={item.key} className="card" aria-label={`Remédio ${index + 1}`}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl">Remédio {index + 1}</h2>
              <button type="button" className="btn-ghost !min-h-10 text-red-800"
                onClick={() => setItems((list) => list.filter((other) => other.key !== item.key))}>
                <Trash2 className="h-5 w-5" aria-hidden="true" /> Remover
              </button>
            </div>
            <MedicationForm value={item.values} flags={item.flags} unread={item.unread} isSubmitted={isSubmitted}
              onChange={(values) => setItems((list) => list.map((other) => (other.key === item.key ? { ...other, values } : other)))} />
          </section>
        ))}
      </div>

      <button type="button" className="btn-secondary mt-4 w-full" onClick={addItem}>
        <Plus className="h-5 w-5" aria-hidden="true" /> Adicionar outro remédio
      </button>

      {state.photo && (
        <label className="mt-4 flex min-h-12 items-center gap-3 text-base font-semibold">
          <input type="checkbox" className="h-6 w-6" checked={keepPhoto} onChange={(event) => setKeepPhoto(event.target.checked)} />
          Guardar foto da receita
        </label>
      )}
      {keepPhoto && <p className="text-sm text-muted">Será guardada uma miniatura pequena, só neste aparelho.</p>}

      <button type="button" disabled={isSaving} className="btn-primary mt-6 w-full !min-h-14 text-lg" onClick={confirm}>
        <CheckCheck className="h-6 w-6" aria-hidden="true" /> Confirmar e criar lembretes
      </button>
    </div>
  );
}
