import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Search } from 'lucide-react';
import { db } from '../db/db';
import { PageHeader } from '../components/PageHeader';
import { doseLabel, frequencyLabel, periodLabel, STATUS_MED } from '../lib/format';
import { overlapsPeriod } from '../lib/adherence';

export default function HistoryPage() {
  const [tab, setTab] = useState<'current' | 'finished'>('current');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const meds = useLiveQuery(() => db.medications.toArray(), []);

  const list = (meds ?? [])
    .filter((m) => (tab === 'finished' ? m.status === 'finished' : m.status !== 'finished'))
    .filter((m) => m.name.toLowerCase().includes(q.trim().toLowerCase()))
    .filter((m) => overlapsPeriod(m, from || undefined, to || undefined))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return (
    <div>
      <PageHeader title="Histórico" />

      <div role="tablist" aria-label="Tipo de tratamento" className="mb-4 grid grid-cols-2 gap-2">
        {([['current', 'Em uso'], ['finished', 'Encerrados']] as const).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} type="button" onClick={() => setTab(k)}
            className={`btn ${tab === k ? 'bg-brand-700 text-white' : 'border-2 border-slate-400 bg-white text-slate-900'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="card mb-4 space-y-3">
        <div>
          <label htmlFor="busca" className="field-label">Buscar pelo nome</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600" aria-hidden="true" />
            <input id="busca" type="search" className="field !pl-10" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ex.: Amoxicilina" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="de" className="field-label">De</label>
            <input id="de" type="date" className="field" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label htmlFor="ate" className="field-label">Até</label>
            <input id="ate" type="date" className="field" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        {(from || to || q) && (
          <button type="button" className="btn-ghost w-full" onClick={() => { setFrom(''); setTo(''); setQ(''); }}>Limpar filtros</button>
        )}
      </div>

      {meds && list.length === 0 ? (
        <p className="card text-center text-base">
          {meds.length === 0
            ? 'Você ainda não cadastrou nenhum remédio. Volte para a tela Hoje e toque em "Fotografar receita" ou "Adicionar manualmente".'
            : 'Nenhum remédio encontrado com esses filtros.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {list.map((m) => (
            <li key={m.id}>
              <Link to={`/historico/${m.id}`} className="card flex items-center gap-3 hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-xl font-bold">{m.name}</p>
                  <p className="text-base">{doseLabel(m)} · {frequencyLabel(m)}</p>
                  <p className="text-sm text-slate-700">{periodLabel(m)}</p>
                  <p className="mt-1 text-sm font-semibold">{STATUS_MED[m.status]}</p>
                </div>
                <ChevronRight className="h-6 w-6 shrink-0" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
