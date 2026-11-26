import { useState, type FormEvent } from 'react';
import { Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { app } from '../../composition-root';
import type { Allergy } from '../../domain/allergy';
import { useLiveData } from '../hooks/useLiveData';
import { useSettings } from '../hooks/useSettings';
import { ALLERGY_ISSUE_MESSAGES } from '../i18n/messages';
import { ConfirmDialog } from './ConfirmDialog';

/** Lets the user register the substances they are allergic to (stored only on the device). */
export function AllergySection() {
  const allergies = useLiveData(() => app.allergies.list());
  const settings = useSettings();
  const [substance, setSubstance] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toRemove, setToRemove] = useState<Allergy | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const result = await app.allergies.add({ substance, notes });
    if (result.ok) {
      setSubstance('');
      setNotes('');
      setError(null);
    } else {
      setError(result.issues.map((code) => ALLERGY_ISSUE_MESSAGES[code]).join(' '));
    }
  }

  return (
    <section className="card mb-4" aria-labelledby="allergies-title">
      <h2 id="allergies-title" className="flex items-center gap-2 text-xl font-bold">
        <ShieldAlert className="h-6 w-6" aria-hidden="true" /> Minhas alergias
      </h2>
      <p className="mt-1 text-base">
        Cadastre remédios ou substâncias que fazem mal a você. Ao conferir uma receita, o app avisa se algum nome parecer igual. O aviso é só uma ajuda: confirme sempre com seu médico ou farmacêutico.
      </p>

      {allergies && allergies.length > 0 && (
        <ul className="mt-3 space-y-2">
          {allergies.map((allergy) => (
            <li key={allergy.id} className="flex items-center justify-between gap-2 rounded-xl border-2 border-slate-300 p-3">
              <div className="min-w-0">
                <p className="break-words font-bold">{allergy.substance}</p>
                {allergy.notes && <p className="break-words text-sm text-slate-700">{allergy.notes}</p>}
              </div>
              <button type="button" className="btn-ghost !min-h-12 shrink-0 text-red-800" aria-label={`Remover alergia ${allergy.substance}`}
                onClick={() => setToRemove(allergy)}>
                <Trash2 className="h-5 w-5" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {allergies && allergies.length === 0 && <p className="mt-3 text-base font-semibold">Nenhuma alergia cadastrada.</p>}

      <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
        <div>
          <label htmlFor="allergy-substance" className="field-label">Remédio ou substância</label>
          <input id="allergy-substance" className="field" value={substance} placeholder="Ex.: dipirona, penicilina"
            aria-invalid={error ? true : undefined} aria-describedby={error ? 'allergy-error' : undefined}
            onChange={(event) => setSubstance(event.target.value)} />
        </div>
        <div>
          <label htmlFor="allergy-notes" className="field-label">O que acontece? (opcional)</label>
          <input id="allergy-notes" className="field" value={notes} placeholder="Ex.: manchas na pele"
            onChange={(event) => setNotes(event.target.value)} />
        </div>
        {error && <p id="allergy-error" role="alert" className="font-semibold text-red-900">{error}</p>}
        <button type="submit" className="btn-primary w-full"><Plus className="h-5 w-5" aria-hidden="true" /> Adicionar alergia</button>
      </form>

      {app.allergies.isAiAvailable() && (
        <div className="mt-4 border-t border-slate-300 pt-4">
          <p className="text-base">
            Verificação por IA: {settings.allergyAiConsent ? 'ligada. Ao verificar, os nomes dos remédios e das suas alergias são enviados pela internet.' : 'desligada. Nada é enviado pela internet.'}
          </p>
          {settings.allergyAiConsent && (
            <button type="button" className="btn-ghost mt-2 w-full" onClick={() => app.settings.save({ allergyAiConsent: false })}>
              Desligar verificação por IA
            </button>
          )}
        </div>
      )}

      <ConfirmDialog open={!!toRemove} danger title="Remover esta alergia?"
        message={`"${toRemove?.substance ?? ''}" deixará de gerar avisos nas próximas receitas.`}
        confirmLabel="Sim, remover" onCancel={() => setToRemove(null)}
        onConfirm={async () => { await app.allergies.remove(toRemove!.id); setToRemove(null); }} />
    </section>
  );
}
