import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Ban, CalendarPlus, Pause, Play, Save, Trash2 } from 'lucide-react';
import { app } from '../../composition-root';
import type { Medication, TreatmentStatus } from '../../domain/medication';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Disclaimer } from '../components/Disclaimer';
import { MedicationForm } from '../components/MedicationForm';
import { PageHeader } from '../components/PageHeader';
import {
  buildMedicationDraft, createEmptyFormValues, medicationToFormValues,
  type MedicationFormIssueCode, type MedicationFormValues,
} from '../forms/medicationFormValues';
import { MEDICATION_ISSUE_MESSAGES } from '../i18n/messages';

/** Creates a medication by hand, or edits/pauses/finishes/deletes an existing one. */
export default function MedicationEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [medication, setMedication] = useState<Medication | null>(null);
  const [values, setValues] = useState<MedicationFormValues>(() => createEmptyFormValues());
  const [issues, setIssues] = useState<MedicationFormIssueCode[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<null | 'delete' | 'finish'>(null);
  const [isLoading, setIsLoading] = useState(!!id);

  useEffect(() => {
    if (!id) return;
    void app.medications.get(id).then((found) => {
      if (found) {
        setMedication(found);
        setValues(medicationToFormValues(found, 'date'));
      }
      setIsLoading(false);
    });
  }, [id]);

  async function save() {
    const { draft, issues: foundIssues } = buildMedicationDraft(values);
    setIssues(foundIssues);
    if (foundIssues.length) { window.scrollTo({ top: 0 }); return; }
    if (id) await app.medications.update(id, draft);
    else await app.medications.create([draft]);
    navigate(id ? `/historico/${id}` : '/');
  }

  async function changeStatus(status: TreatmentStatus, destination: string) {
    await app.medications.setStatus(medication!.id, status);
    navigate(destination);
  }

  if (isLoading) return <p>Carregando…</p>;
  if (id && !medication) return (
    <div><PageHeader title="Não encontrado" back="/" /><p>Este remédio não existe mais. Volte para a tela inicial.</p></div>
  );

  return (
    <div className="pb-4">
      <PageHeader title={id ? 'Editar remédio' : 'Novo remédio'} back />
      <Disclaimer className="mb-4" />
      {issues.length > 0 && (
        <div role="alert" className="mb-4 rounded-xl border-2 border-red-600 bg-red-50 p-3 text-red-950">
          <p className="font-bold">Falta pouco! Corrija:</p>
          <ul className="list-disc pl-5">{issues.map((code) => <li key={code}>{MEDICATION_ISSUE_MESSAGES[code]}</li>)}</ul>
        </div>
      )}
      <MedicationForm value={values} onChange={setValues} isSubmitted={issues.length > 0} />

      <div className="mt-6 space-y-3">
        <button type="button" className="btn-primary w-full !min-h-14 text-lg" onClick={save}>
          <Save className="h-6 w-6" aria-hidden="true" /> Salvar
        </button>

        {medication && (
          <>
            <button type="button" className="btn-secondary w-full" onClick={() => app.calendar.download(medication)}>
              <CalendarPlus className="h-5 w-5" aria-hidden="true" /> Adicionar lembretes ao calendário
            </button>
            <p className="text-sm text-muted">
              O calendário do celular avisa mesmo com o app fechado. É a forma mais confiável de receber lembretes.
            </p>
            {medication.status === 'active' && (
              <button type="button" className="btn-ghost w-full" onClick={() => changeStatus('paused', `/historico/${medication.id}`)}>
                <Pause className="h-5 w-5" aria-hidden="true" /> Pausar
              </button>
            )}
            {medication.status !== 'active' && (
              <button type="button" className="btn-ghost w-full" onClick={() => changeStatus('active', `/historico/${medication.id}`)}>
                <Play className="h-5 w-5" aria-hidden="true" /> Retomar tratamento
              </button>
            )}
            {medication.status !== 'finished' && (
              <button type="button" className="btn-ghost w-full" onClick={() => setPendingConfirmation('finish')}>
                <Ban className="h-5 w-5" aria-hidden="true" /> Encerrar tratamento
              </button>
            )}
            <button type="button" className="btn-danger w-full" onClick={() => setPendingConfirmation('delete')}>
              <Trash2 className="h-5 w-5" aria-hidden="true" /> Excluir
            </button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={pendingConfirmation === 'delete'} danger title="Excluir este remédio?"
        message="O remédio e todo o registro de doses dele serão apagados. Isso não pode ser desfeito."
        confirmLabel="Sim, excluir" onCancel={() => setPendingConfirmation(null)}
        onConfirm={async () => { await app.medications.remove(medication!.id); navigate('/historico'); }}
      />
      <ConfirmDialog
        open={pendingConfirmation === 'finish'} title="Encerrar o tratamento?"
        message="As doses futuras serão removidas. O histórico continua guardado na aba Encerrados."
        confirmLabel="Encerrar" onCancel={() => setPendingConfirmation(null)}
        onConfirm={() => changeStatus('finished', '/historico')}
      />
    </div>
  );
}
