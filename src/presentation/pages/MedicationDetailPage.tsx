import { Link, useParams } from 'react-router-dom';
import { CalendarPlus, Pencil } from 'lucide-react';
import { app } from '../../composition-root';
import { computeAdherence } from '../../domain/adherence';
import { describeFrequency, describePeriod, formatDateTime, formatDosage } from '../../shared/ptBR/format';
import { MEDICATION_FORM_LABELS, TREATMENT_STATUS_LABELS } from '../../shared/ptBR/labels';
import { Disclaimer } from '../components/Disclaimer';
import { DoseStatusBadge } from '../components/DoseStatusBadge';
import { PageHeader } from '../components/PageHeader';
import { useLiveData } from '../hooks/useLiveData';

/** One medication: its data, adherence, stored prescription photo and the full dose log. */
export default function MedicationDetailPage() {
  const { id = '' } = useParams();
  // Wrapped in an object so that "still loading" (undefined) differs from "not found" ({ detail: undefined }).
  const result = useLiveData(async () => ({ detail: await app.medications.getDetail(id) }), [id]);

  if (!result) return <p>Carregando…</p>;
  const { detail } = result;
  if (!detail) return <div><PageHeader title="Não encontrado" back="/historico" /><p>Este remédio não existe mais.</p></div>;

  const { medication, doses, photo } = detail;
  const adherence = computeAdherence(doses);
  const rows: Array<[string, string]> = [
    ['Dosagem', formatDosage(medication.dosage) || '—'],
    ['Forma', MEDICATION_FORM_LABELS[medication.form]],
    ['Frequência', describeFrequency(medication.schedule)],
    ['Período', describePeriod(medication.period)],
    ['Situação', TREATMENT_STATUS_LABELS[medication.status]],
  ];
  if (medication.instructions) rows.push(['Como tomar', medication.instructions]);
  if (medication.prescriber) rows.push(['Médico', medication.prescriber]);
  if (medication.notes) rows.push(['Observações', medication.notes]);

  return (
    <div>
      <PageHeader title={medication.name} back="/historico" />

      <div className="xl:grid xl:grid-cols-2 xl:items-start xl:gap-8">
        <div className="min-w-0">
          <section className="card mb-4" aria-label="Dados do remédio">
            <dl className="space-y-2">
              {rows.map(([label, text]) => (
                <div key={label}>
                  <dt className="text-sm font-semibold text-muted">{label}</dt>
                  <dd className="text-base">{text}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 grid gap-2">
              <Link to={`/medicamento/${medication.id}/editar`} className="btn-primary"><Pencil className="h-5 w-5" aria-hidden="true" /> Editar ou encerrar</Link>
              <button type="button" className="btn-secondary" onClick={() => app.calendar.download(medication)}>
                <CalendarPlus className="h-5 w-5" aria-hidden="true" /> Adicionar lembretes ao calendário
              </button>
            </div>
          </section>

          <section className="card mb-4" aria-label="Adesão ao tratamento">
            <h2 className="text-xl">Adesão</h2>
            {adherence.percentage === null ? (
              <p className="mt-1 text-base">Ainda não há doses previstas.</p>
            ) : (
              <>
                <p className="mt-1 text-3xl font-bold">{adherence.percentage}%</p>
                <p className="text-base">{adherence.taken} tomadas de {adherence.expected} previstas</p>
                <div className="mt-2 h-4 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                  <div className="h-full bg-green-700" style={{ width: `${adherence.percentage}%` }} />
                </div>
                <p className="mt-2 text-sm text-muted">Puladas: {adherence.skipped} · Perdidas: {adherence.missed}</p>
              </>
            )}
          </section>

          {photo && (
            <section className="card mb-4">
              <h2 className="mb-2 text-xl">Foto da receita</h2>
              <img src={photo.dataUrl} alt="Miniatura da receita guardada" className="w-full rounded-lg border border-slate-300" />
            </section>
          )}
        </div>
        <div className="min-w-0">
          <section aria-label="Registro de doses">
            <h2 className="mb-2 text-xl">Registro de doses</h2>
            {doses.length === 0 ? (
              <p className="card text-base">Nenhuma dose registrada ainda.</p>
            ) : (
              <ul className="space-y-2">
                {[...doses].reverse().map((dose) => (
                  <li key={dose.id} className="card flex flex-wrap items-center justify-between gap-2 !p-3">
                    <span className="text-base font-semibold">{formatDateTime(dose.scheduledAt)}</span>
                    <DoseStatusBadge dose={dose} />
                    {dose.status === 'missed' && (
                      <button type="button" className="btn-ghost !min-h-10 text-sm" onClick={() => app.doses.mark(dose.id, 'taken')}>Eu tomei</button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
      <Disclaimer className="mt-4" />
    </div>
  );
}
