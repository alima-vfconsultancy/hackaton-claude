import { Info } from 'lucide-react';
import { DISCLAIMER } from '../../shared/ptBR/labels';

export function Disclaimer({ className = '' }: { className?: string }) {
  return (
    <p
      role="note"
      className={`flex gap-2 rounded-xl border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950 ${className}`}
    >
      <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <span>{DISCLAIMER}</span>
    </p>
  );
}
