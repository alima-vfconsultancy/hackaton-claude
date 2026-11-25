import { useState } from 'react';
import { startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DayButton, DayPicker, getDefaultClassNames, type DayButtonProps } from 'react-day-picker';
import 'react-day-picker/style.css';
import { app } from '../../composition-root';
import { dayAgendaEntryTime, type DayAgendaEntry } from '../../domain/dayAgenda';
import { formatLocalDate } from '../../domain/time';
import { describeMedication, formatDayLong, formatTime } from '../../shared/ptBR/format';
import { DoseStatusBadge } from '../components/DoseStatusBadge';
import { PageHeader } from '../components/PageHeader';
import { useLiveData } from '../hooks/useLiveData';

/** Day button that adds a small dot under the number when the `hasDoses` modifier matches. */
function DayButtonWithDoseDot(props: DayButtonProps) {
  const { day, modifiers, ...buttonProps } = props;
  return (
    <DayButton {...buttonProps} day={day} modifiers={modifiers}>
      {day.date.getDate()}
      {modifiers.hasDoses && (
        <span className="mx-auto mt-0.5 block h-1.5 w-1.5 rounded-full bg-brand-700" aria-hidden="true" />
      )}
    </DayButton>
  );
}

/** Month view: pick a day, see every medicine and time scheduled for it. */
export default function CalendarPage() {
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));

  const monthStart = startOfDay(new Date(month.getFullYear(), month.getMonth(), 1));
  const monthEnd = startOfDay(new Date(month.getFullYear(), month.getMonth() + 1, 0));
  const datesWithDoses = useLiveData(() => app.agenda.getDatesWithDoses(monthStart, monthEnd), [monthStart.getTime()]);
  const dayAgenda = useLiveData(() => app.agenda.getDayAgenda(selectedDate), [selectedDate.getTime()]);

  const defaultClassNames = getDefaultClassNames();

  return (
    <div>
      <PageHeader title="Calendário" />

      <div className="card mb-4">
        <DayPicker
          mode="single"
          required
          locale={ptBR}
          weekStartsOn={0}
          month={month}
          onMonthChange={setMonth}
          selected={selectedDate}
          onSelect={(date) => setSelectedDate(startOfDay(date))}
          modifiers={{ hasDoses: (date) => datesWithDoses?.has(formatLocalDate(date)) ?? false }}
          components={{ DayButton: DayButtonWithDoseDot }}
          classNames={{
            today: `${defaultClassNames.today} font-bold text-brand-800`,
            selected: `${defaultClassNames.selected} bg-brand-700 text-white rounded-xl`,
          }}
        />
      </div>

      <h2 className="mb-2 text-xl font-bold capitalize">{formatDayLong(selectedDate)}</h2>

      {dayAgenda && dayAgenda.length === 0 ? (
        <p className="card text-center text-base">Nenhuma dose prevista para este dia.</p>
      ) : (
        <ul className="space-y-3" aria-label="Doses do dia selecionado">
          {(dayAgenda ?? []).map((entry) => <CalendarEntryCard key={entryKey(entry)} entry={entry} />)}
        </ul>
      )}
    </div>
  );
}

function entryKey(entry: DayAgendaEntry): string {
  return entry.kind === 'logged' ? `log:${entry.dose.id}` : `plan:${entry.medication.id}:${entry.scheduledAt}`;
}

function CalendarEntryCard({ entry }: { entry: DayAgendaEntry }) {
  return (
    <li className="card flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="break-words text-lg font-bold">{describeMedication(entry.medication)}</p>
        {entry.kind === 'logged' ? <DoseStatusBadge dose={entry.dose} /> : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
            Planejada
          </span>
        )}
      </div>
      <p className="shrink-0 text-xl font-bold tabular-nums">{formatTime(dayAgendaEntryTime(entry))}</p>
    </li>
  );
}
