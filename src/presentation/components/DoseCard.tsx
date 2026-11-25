import { Check, Clock, SkipForward, Undo2 } from 'lucide-react';
import { app } from '../../composition-root';
import { effectiveTime, isOpen, type DoseLog } from '../../domain/dose';
import type { Medication } from '../../domain/medication';
import { formatDosage, formatTime } from '../../shared/ptBR/format';
import { DoseStatusBadge } from './DoseStatusBadge';

/** One dose of the day with the actions to register, skip, snooze or undo it. */
export function DoseCard({
  dose,
  medication,
  highlight,
  snoozeMinutes,
}: {
  dose: DoseLog;
  medication: Medication;
  highlight?: boolean;
  snoozeMinutes: number;
}) {
  const isActionable = isOpen(dose) || dose.status === 'missed';
  return (
    <li
      className={`card ${highlight ? 'border-2 border-brand-700 ring-2 ring-brand-100' : ''}`}
      aria-label={`${medication.name}, ${formatTime(effectiveTime(dose))}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {highlight && <p className="mb-1 text-sm font-bold uppercase tracking-wide text-brand-800">Próxima dose</p>}
          <h3 className="break-words text-xl font-bold">{medication.name}</h3>
          <p className="text-base text-slate-800">
            {formatDosage(medication.dosage) || 'Dosagem não informada'}
            {medication.instructions ? ` · ${medication.instructions}` : ''}
          </p>
        </div>
        <p className="shrink-0 text-2xl font-bold tabular-nums">{formatTime(dose.scheduledAt)}</p>
      </div>

      <div className="mt-2">
        <DoseStatusBadge dose={dose} />
      </div>

      {isActionable ? (
        <div className={`mt-3 grid gap-2 ${dose.status === 'missed' ? 'grid-cols-2' : 'grid-cols-3'}`}>
          <button type="button" className="btn bg-green-700 text-white hover:bg-green-800" onClick={() => app.doses.mark(dose.id, 'taken')}>
            <Check className="h-5 w-5" aria-hidden="true" /> Tomei
          </button>
          <button type="button" className="btn-ghost" onClick={() => app.doses.mark(dose.id, 'skipped')}>
            <SkipForward className="h-5 w-5" aria-hidden="true" /> Pular
          </button>
          {dose.status !== 'missed' && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => app.doses.snooze(dose.id, snoozeMinutes)}
              aria-label={`Adiar ${snoozeMinutes} minutos`}
            >
              <Clock className="h-5 w-5" aria-hidden="true" /> Adiar
            </button>
          )}
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-2">
          {dose.takenAt && <p className="text-base">Registrada às {formatTime(dose.takenAt)}</p>}
          <button type="button" className="btn-ghost ml-auto" onClick={() => app.doses.undo(dose.id)}>
            <Undo2 className="h-5 w-5" aria-hidden="true" /> Desfazer
          </button>
        </div>
      )}
    </li>
  );
}
