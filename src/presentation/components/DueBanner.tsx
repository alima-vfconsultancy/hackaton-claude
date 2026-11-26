import { Link, useLocation } from 'react-router-dom';
import { BellRing } from 'lucide-react';
import type { DueDose } from '../../application/reminderService';
import { formatDosage } from '../../shared/ptBR/format';

/** Visual alert inside the app when there are doses due now. */
export function DueBanner({ due }: { due: DueDose[] }) {
  const { pathname } = useLocation();
  if (due.length === 0 || pathname === '/') return null;
  const [first] = due;
  return (
    <Link
      to="/"
      role="alert"
      className="mb-4 flex items-center gap-3 rounded-xl border-2 border-accent-600 bg-accent-100 p-3 text-ink"
    >
      <BellRing className="h-7 w-7 shrink-0" aria-hidden="true" />
      <span className="text-base font-bold">
        Hora de tomar {first.medication.name} {formatDosage(first.medication.dosage)}
        {due.length > 1 ? ` e mais ${due.length - 1}` : ''}. Toque para registrar.
      </span>
    </Link>
  );
}
