import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Ban, CalendarPlus, Pause, Play, Save, Trash2 } from 'lucide-react';
import { db } from '../db/db';
import type { Medication, MedicationInput } from '../types';
import { emptyMedication, toInput, validateMedication } from '../lib/medicationDefaults';
import { createMedication, deleteMedication, setMedicationStatus, updateMedication } from '../db/repo';
import { MedicationForm } from '../components/MedicationForm';
import { PageHeader } from '../components/PageHeader';
import { Disclaimer } from '../components/Disclaimer';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { downloadIcs } from '../lib/ics';

export default function MedicationEditPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [med, setMed] = useState<Medication | null>(null);
  const [value, setValue] = useState<MedicationInput>(emptyMedication);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<null | 'delete' | 'finish'>(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (!id) return;
    db.medications.get(id).then((m) => {
      if (m) { setMed(m); setValue(toInput(m)); }
      setLoading(false);
    });
  }, [id]);

  async function save() {
    const errs = validateMedication(value);
    setErrors(errs);
    if (errs.length) { window.scrollTo({ top: 0 }); return; }
    if (id) await updateMedication(id, value);
    else await createMedication(value);
    nav(id ? `/historico/${id}` : '/');
  }

  if (loading) return <p>Carregando…</p>;
  if (id && !med) return (
    <div><PageHeader title="Não encontrado" back="/" /><p>Este remédio não existe mais. Volte para a tela inicial.</p></div>
  );

  return (
    <div className="pb-4">
      <PageHeader title={id ? 'Editar remédio' : 'Novo remédio'} back />
      <Disclaimer className="mb-4" />
      {errors.length > 0 && (
        <div role="alert" className="mb-4 rounded-xl border-2 border-red-600 bg-red-50 p-3 text-red-950">
          <p className="font-bold">Falta pouco! Corrija:</p>
          <ul className="list-disc pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}
      <MedicationForm value={value} onChange={setValue} />

      <div className="mt-6 space-y-3">
        <button type="button" className="btn-primary w-full !min-h-14 text-lg" onClick={save}>
          <Save className="h-6 w-6" aria-hidden="true" /> Salvar
        </button>

        {med && (
          <>
            <button type="button" className="btn-secondary w-full" onClick={() => downloadIcs(med)}>
              <CalendarPlus className="h-5 w-5" aria-hidden="true" /> Adicionar lembretes ao calendário
            </button>
            <p className="text-sm text-slate-700">
              O calendário do celular avisa mesmo com o app fechado. É a forma mais confiável de receber lembretes.
            </p>
            {med.status === 'active' && (
              <button type="button" className="btn-ghost w-full" onClick={async () => { await setMedicationStatus(med.id, 'paused'); nav(`/historico/${med.id}`); }}>
                <Pause className="h-5 w-5" aria-hidden="true" /> Pausar
              </button>
            )}
            {med.status !== 'active' && (
              <button type="button" className="btn-ghost w-full" onClick={async () => { await setMedicationStatus(med.id, 'active'); nav(`/historico/${med.id}`); }}>
                <Play className="h-5 w-5" aria-hidden="true" /> Retomar tratamento
              </button>
            )}
            {med.status !== 'finished' && (
              <button type="button" className="btn-ghost w-full" onClick={() => setConfirm('finish')}>
                <Ban className="h-5 w-5" aria-hidden="true" /> Encerrar tratamento
              </button>
            )}
            <button type="button" className="btn-danger w-full" onClick={() => setConfirm('delete')}>
              <Trash2 className="h-5 w-5" aria-hidden="true" /> Excluir
            </button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirm === 'delete'} danger title="Excluir este remédio?"
        message="O remédio e todo o registro de doses dele serão apagados. Isso não pode ser desfeito."
        confirmLabel="Sim, excluir" onCancel={() => setConfirm(null)}
        onConfirm={async () => { await deleteMedication(med!.id); nav('/historico'); }}
      />
      <ConfirmDialog
        open={confirm === 'finish'} title="Encerrar o tratamento?"
        message="As doses futuras serão removidas. O histórico continua guardado na aba Encerrados."
        confirmLabel="Encerrar" onCancel={() => setConfirm(null)}
        onConfirm={async () => { await setMedicationStatus(med!.id, 'finished'); nav('/historico'); }}
      />
    </div>
  );
}
