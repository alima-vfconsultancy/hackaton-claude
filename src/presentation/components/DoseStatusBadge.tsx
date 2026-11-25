import { AlertTriangle, BellRing, CheckCircle2, Clock, SkipForward } from 'lucide-react';
import type { DoseLog, DoseStatus } from '../../domain/dose';
import { formatTime } from '../../shared/ptBR/format';
import { DOSE_STATUS_LABELS } from '../../shared/ptBR/labels';

const STATUS_STYLES: Record<DoseStatus, { Icon: typeof Clock; className: string }> = {
  pending: { Icon: Clock, className: 'bg-mint text-brand-700 border-brand-700' },
  taken: { Icon: CheckCircle2, className: 'bg-green-100 text-green-900 border-green-500' },
  skipped: { Icon: SkipForward, className: 'bg-slate-200 text-ink border-slate-500' },
  missed: { Icon: AlertTriangle, className: 'bg-red-100 text-red-900 border-red-500' },
  snoozed: { Icon: BellRing, className: 'bg-accent-100 text-ink border-accent-600' },
};

/** Status is always shown with color + icon + text. */
export function DoseStatusBadge({ dose }: { dose: Pick<DoseLog, 'status' | 'snoozedUntil'> }) {
  const { Icon, className } = STATUS_STYLES[dose.status];
  const snoozeNote = dose.status === 'snoozed' && dose.snoozedUntil ? ` até ${formatTime(dose.snoozedUntil)}` : '';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${className}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {DOSE_STATUS_LABELS[dose.status]}
      {snoozeNote}
    </span>
  );
}
