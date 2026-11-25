import { AlertTriangle, BellRing, CheckCircle2, Clock, SkipForward } from 'lucide-react';
import type { DoseLog } from '../types';
import { fmtTime } from '../lib/format';

const META = {
  pending: { label: 'Pendente', Icon: Clock, cls: 'bg-blue-100 text-blue-900 border-blue-400' },
  taken: { label: 'Tomada', Icon: CheckCircle2, cls: 'bg-green-100 text-green-900 border-green-500' },
  skipped: { label: 'Pulada', Icon: SkipForward, cls: 'bg-slate-200 text-slate-900 border-slate-500' },
  missed: { label: 'Perdida', Icon: AlertTriangle, cls: 'bg-red-100 text-red-900 border-red-500' },
  snoozed: { label: 'Adiada', Icon: BellRing, cls: 'bg-amber-100 text-amber-950 border-amber-600' },
} as const;

export const doseStatusLabel = (s: DoseLog['status']) => META[s].label;

/** Status sempre com cor + ícone + texto. */
export function DoseStatusBadge({ dose }: { dose: Pick<DoseLog, 'status' | 'snoozedUntil'> }) {
  const { label, Icon, cls } = META[dose.status];
  const extra = dose.status === 'snoozed' && dose.snoozedUntil ? ` até ${fmtTime(dose.snoozedUntil)}` : '';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${cls}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
      {extra}
    </span>
  );
}
