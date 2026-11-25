import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { app } from '../../composition-root';
import { matchesTreatmentFilter, overlapsPeriod } from '../../domain/adherence';
import { describeFrequency, describePeriod, formatDosage } from '../../shared/ptBR/format';
import { TREATMENT_STATUS_LABELS } from '../../shared/ptBR/labels';
import { PageHeader } from '../components/PageHeader';
import { useLiveData } from '../hooks/useLiveData';

type HistoryTab = 'current' | 'finished';

const TABS: Array<[HistoryTab, string]> = [['current', 'Em uso'], ['finished', 'Encerrados']];

/** Lists every treatment, with tabs (in use / finished), name search and period filter. */
export default function HistoryPage() {
  const [tab, setTab] = useState<HistoryTab>('current');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const medications = useLiveData(() => app.medications.list(), []);

  const visible = (medications ?? [])
    .filter((medication) => matchesTreatmentFilter(medication, tab === 'finished' ? 'past' : 'current'))
    .filter((medication) => medication.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter((medication) => overlapsPeriod(medication, from || undefined, to || undefined))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return (
    <div>
      <PageHeader title="Histórico" />

      <div role="tablist" aria-label="Tipo de tratamento" className="mb-4 grid grid-cols-2 gap-2">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key} type="button" onClick={() => setTab(key)}
            className={`btn ${tab === key ? 'bg-brand-700 text-white' : 'border-2 border-slate-400 bg-white text-slate-900'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="card mb-4 space-y-3">
        <div>
          <label htmlFor="history-search" className="field-label">Buscar pelo nome</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-600" aria-hidden="true" />
            <input id="history-search" type="search" className="field !pl-10" value={search}
              onChange={(event) => setSearch(event.target.value)} placeholder="Ex.: Amoxicilina" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="history-from" className="field-label">De</label>
            <input id="history-from" type="date" className="field" value={from} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div>
            <label htmlFor="history-to" className="field-label">Até</label>
            <input id="history-to" type="date" className="field" value={to} onChange={(event) => setTo(event.target.value)} />
          </div>
        </div>
        {(from || to || search) && (
          <button type="button" className="btn-ghost w-full" onClick={() => { setFrom(''); setTo(''); setSearch(''); }}>Limpar filtros</button>
        )}
      </div>

      {medications && visible.length === 0 ? (
        <p className="card text-center text-base">
          {medications.length === 0
            ? 'Você ainda não cadastrou nenhum remédio. Volte para a tela Hoje e toque em "Fotografar receita" ou "Adicionar manualmente".'
            : 'Nenhum remédio encontrado com esses filtros.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((medication) => (
            <li key={medication.id}>
              <Link to={`/historico/${medication.id}`} className="card flex items-center gap-3 hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-xl font-bold">{medication.name}</p>
                  <p className="text-base">{formatDosage(medication.dosage)} · {describeFrequency(medication.schedule)}</p>
                  <p className="text-sm text-slate-700">{describePeriod(medication.period)}</p>
                  <p className="mt-1 text-sm font-semibold">{TREATMENT_STATUS_LABELS[medication.status]}</p>
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
