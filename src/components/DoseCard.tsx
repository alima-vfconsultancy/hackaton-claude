import { Check, Clock, SkipForward, Undo2 } from 'lucide-react';
import type { DoseLog, Medication } from '../types';
import { doseLabel, fmtTime } from '../lib/format';
import { effectiveTime, isOpen } from '../lib/doseRules';
import { markDose, snoozeDose, undoDose } from '../db/repo';
import { DoseStatusBadge } from './DoseStatus';

export function DoseCard({
  dose,
  med,
  highlight,
  snoozeMinutes,
}: {
  dose: DoseLog;
  med: Medication;
  highlight?: boolean;
  snoozeMinutes: number;
}) {
  const open = isOpen(dose) || dose.status === 'missed';
  return (
    <li
      className={`card ${highlight ? 'border-2 border-brand-700 ring-2 ring-brand-100' : ''}`}
      aria-label={`${med.name}, ${fmtTime(effectiveTime(dose))}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {highlight && <p className="mb-1 text-sm font-bold uppercase tracking-wide text-brand-800">Próxima dose</p>}
          <h3 className="break-words text-xl font-bold">{med.name}</h3>
          <p className="text-base text-slate-800">
            {doseLabel(med) || 'Dosagem não informada'}
            {med.instructions ? ` · ${med.instructions}` : ''}
          </p>
        </div>
        <p className="shrink-0 text-2xl font-bold tabular-nums">{fmtTime(dose.scheduledAt)}</p>
      </div>

      <div className="mt-2">
        <DoseStatusBadge dose={dose} />
      </div>

      {open ? (
        <div className={`mt-3 grid gap-2 ${dose.status === 'missed' ? 'grid-cols-2' : 'grid-cols-3'}`}>
          <button type="button" className="btn bg-green-700 text-white hover:bg-green-800" onClick={() => markDose(dose.id, 'taken')}>
            <Check className="h-5 w-5" aria-hidden="true" /> Tomei
          </button>
          <button type="button" className="btn-ghost" onClick={() => markDose(dose.id, 'skipped')}>
            <SkipForward className="h-5 w-5" aria-hidden="true" /> Pular
          </button>
          {dose.status !== 'missed' && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => snoozeDose(dose.id, snoozeMinutes)}
              aria-label={`Adiar ${snoozeMinutes} minutos`}
            >
              <Clock className="h-5 w-5" aria-hidden="true" /> Adiar
            </button>
          )}
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-2">
          {dose.takenAt && <p className="text-base">Registrada às {fmtTime(dose.takenAt)}</p>}
          <button type="button" className="btn-ghost ml-auto" onClick={() => undoDose(dose.id)}>
            <Undo2 className="h-5 w-5" aria-hidden="true" /> Desfazer
          </button>
        </div>
      )}
    </li>
  );
}
