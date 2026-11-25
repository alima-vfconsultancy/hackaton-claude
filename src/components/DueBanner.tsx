import { Link, useLocation } from 'react-router-dom';
import { BellRing } from 'lucide-react';
import type { DueDose } from '../hooks/useReminders';
import { doseLabel } from '../lib/format';

/** Alerta visual dentro do app quando há doses na hora. */
export function DueBanner({ due }: { due: DueDose[] }) {
  const { pathname } = useLocation();
  if (due.length === 0 || pathname === '/') return null;
  const first = due[0];
  return (
    <Link
      to="/"
      role="alert"
      className="mb-4 flex items-center gap-3 rounded-xl border-2 border-amber-700 bg-amber-100 p-3 text-amber-950"
    >
      <BellRing className="h-7 w-7 shrink-0" aria-hidden="true" />
      <span className="text-base font-bold">
        Hora de tomar {first.med.name} {doseLabel(first.med)}
        {due.length > 1 ? ` e mais ${due.length - 1}` : ''}. Toque para registrar.
      </span>
    </Link>
  );
}
