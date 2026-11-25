import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarPlus, Pencil } from 'lucide-react';
import { db } from '../db/db';
import { PageHeader } from '../components/PageHeader';
import { DoseStatusBadge } from '../components/DoseStatus';
import { Disclaimer } from '../components/Disclaimer';
import { computeAdherence } from '../lib/adherence';
import { doseLabel, fmtDateTime, frequencyLabel, periodLabel, STATUS_MED } from '../lib/format';
import { downloadIcs } from '../lib/ics';
import { markDose } from '../db/repo';

export default function MedicationDetailPage() {
  const { id = '' } = useParams();
  const data = useLiveQuery(async () => {
    const med = await db.medications.get(id);
    const doses = await db.doseLogs.where('medicationId').equals(id).sortBy('scheduledAt');
    const photo = med?.photoId ? await db.photos.get(med.photoId) : undefined;
    return { med, doses, photo };
  }, [id]);

  if (!data) return <p>Carregando…</p>;
  const { med, doses, photo } = data;
  if (!med) return <div><PageHeader title="Não encontrado" back="/historico" /><p>Este remédio não existe mais.</p></div>;

  const a = computeAdherence(doses);
  const rows: Array<[string, string]> = [
    ['Dosagem', doseLabel(med) || '—'],
    ['Forma', med.form],
    ['Frequência', frequencyLabel(med)],
    ['Período', periodLabel(med)],
    ['Situação', STATUS_MED[med.status]],
  ];
  if (med.instructions) rows.push(['Como tomar', med.instructions]);
  if (med.prescriber) rows.push(['Médico', med.prescriber]);
  if (med.notes) rows.push(['Observações', med.notes]);

  return (
    <div>
      <PageHeader title={med.name} back="/historico" />

      <section className="card mb-4" aria-label="Dados do remédio">
        <dl className="space-y-2">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt className="text-sm font-semibold text-slate-700">{k}</dt>
              <dd className="text-base">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 grid gap-2">
          <Link to={`/medicamento/${med.id}/editar`} className="btn-primary"><Pencil className="h-5 w-5" aria-hidden="true" /> Editar ou encerrar</Link>
          <button type="button" className="btn-secondary" onClick={() => downloadIcs(med)}>
            <CalendarPlus className="h-5 w-5" aria-hidden="true" /> Adicionar lembretes ao calendário
          </button>
        </div>
      </section>

      <section className="card mb-4" aria-label="Adesão ao tratamento">
        <h2 className="text-xl font-bold">Adesão</h2>
        {a.pct === null ? (
          <p className="mt-1 text-base">Ainda não há doses previstas.</p>
        ) : (
          <>
            <p className="mt-1 text-3xl font-bold">{a.pct}%</p>
            <p className="text-base">{a.taken} tomadas de {a.expected} previstas</p>
            <div className="mt-2 h-4 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
              <div className="h-full bg-green-700" style={{ width: `${a.pct}%` }} />
            </div>
            <p className="mt-2 text-sm text-slate-700">Puladas: {a.skipped} · Perdidas: {a.missed}</p>
          </>
        )}
      </section>

      {photo && (
        <section className="card mb-4">
          <h2 className="mb-2 text-xl font-bold">Foto da receita</h2>
          <img src={photo.dataUrl} alt="Miniatura da receita guardada" className="w-full rounded-lg border border-slate-300" />
        </section>
      )}

      <section aria-label="Registro de doses">
        <h2 className="mb-2 text-xl font-bold">Registro de doses</h2>
        {doses.length === 0 ? (
          <p className="card text-base">Nenhuma dose registrada ainda.</p>
        ) : (
          <ul className="space-y-2">
            {[...doses].reverse().map((d) => (
              <li key={d.id} className="card flex flex-wrap items-center justify-between gap-2 !p-3">
                <span className="text-base font-semibold">{fmtDateTime(d.scheduledAt)}</span>
                <DoseStatusBadge dose={d} />
                {d.status === 'missed' && (
                  <button type="button" className="btn-ghost !min-h-10 text-sm" onClick={() => markDose(d.id, 'taken')}>Eu tomei</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <Disclaimer className="mt-4" />
    </div>
  );
}
