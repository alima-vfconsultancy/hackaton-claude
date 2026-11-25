import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function PageHeader({ title, back, children }: { title: string; back?: boolean | string; children?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="mb-4 flex items-center gap-2">
      {back && (
        <button
          type="button"
          onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
          className="btn-ghost !px-3"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-6 w-6" aria-hidden="true" />
        </button>
      )}
      <h1 className="flex-1 text-2xl font-bold">{title}</h1>
      {children}
    </header>
  );
}
