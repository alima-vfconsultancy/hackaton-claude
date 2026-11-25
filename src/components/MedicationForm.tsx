import { useId } from 'react';
import { Plus, X } from 'lucide-react';
import { MED_FORMS, UNITS, type MedicationInput } from '../types';
import { previewText } from '../lib/schedule';

type EndMode = 'continuous' | 'days' | 'date';
const endMode = (m: MedicationInput): EndMode => (m.continuous ? 'continuous' : m.durationDays ? 'days' : 'date');

export interface FieldFlags {
  name?: boolean;
  dosage?: boolean;
  schedule?: boolean;
  duration?: boolean;
}

export function MedicationForm({
  value,
  onChange,
  flags = {},
}: {
  value: MedicationInput;
  onChange: (v: MedicationInput) => void;
  /** Campos de baixa confiança do OCR (destacados para conferência). */
  flags?: FieldFlags;
}) {
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;
  const set = (patch: Partial<MedicationInput>) => onChange({ ...value, ...patch });
  const mode = endMode(value);
  const warn = (on?: boolean) => (on ? 'field-warn' : '');
  const hint = (on?: boolean) =>
    on ? (
      <p className="mt-1 text-sm font-semibold text-amber-900">⚠ Leitura incerta. Confira com a receita.</p>
    ) : null;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={id('name')} className="field-label">Nome do remédio *</label>
        <input id={id('name')} className={`field ${warn(flags.name)}`} value={value.name} autoComplete="off"
          onChange={(e) => set({ name: e.target.value })} placeholder="Ex.: Amoxicilina" />
        {hint(flags.name)}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={id('dosage')} className="field-label">Dosagem</label>
          <input id={id('dosage')} className={`field ${warn(flags.dosage)}`} value={value.dosage} inputMode="decimal"
            onChange={(e) => set({ dosage: e.target.value })} placeholder="500" />
        </div>
        <div>
          <label htmlFor={id('unit')} className="field-label">Unidade</label>
          <select id={id('unit')} className={`field ${warn(flags.dosage)}`} value={value.unit} onChange={(e) => set({ unit: e.target.value })}>
            {[...new Set([...UNITS, value.unit].filter(Boolean))].map((u) => <option key={u}>{u}</option>)}
          </select>
        </div>
      </div>
      {hint(flags.dosage)}

      <div>
        <label htmlFor={id('form')} className="field-label">Forma</label>
        <select id={id('form')} className="field" value={value.form} onChange={(e) => set({ form: e.target.value as MedicationInput['form'] })}>
          {MED_FORMS.map((f) => <option key={f}>{f}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor={id('instr')} className="field-label">Como tomar (opcional)</label>
        <input id={id('instr')} className="field" value={value.instructions} onChange={(e) => set({ instructions: e.target.value })}
          placeholder="Ex.: após as refeições" />
      </div>

      <fieldset className={`rounded-xl border-2 p-3 ${flags.schedule ? 'border-amber-600 bg-amber-50' : 'border-slate-300'}`}>
        <legend className="px-1 text-base font-semibold">Com que frequência?</legend>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de frequência">
          {([['interval', 'De X em X horas'], ['fixedTimes', 'Horários fixos']] as const).map(([k, label]) => (
            <button key={k} type="button" role="radio" aria-checked={value.scheduleType === k}
              onClick={() => set({ scheduleType: k })}
              className={`btn ${value.scheduleType === k ? 'bg-brand-700 text-white' : 'border-2 border-slate-400 bg-white text-slate-900'}`}>
              {label}
            </button>
          ))}
        </div>

        {value.scheduleType === 'interval' ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={id('hours')} className="field-label">A cada quantas horas</label>
              <input id={id('hours')} type="number" min={1} max={168} inputMode="numeric" className="field"
                value={value.intervalHours ?? ''} onChange={(e) => set({ intervalHours: e.target.value ? Number(e.target.value) : undefined })} />
            </div>
            <div>
              <label htmlFor={id('first')} className="field-label">Primeira dose às</label>
              <input id={id('first')} type="time" className="field" value={value.firstDoseTime}
                onChange={(e) => set({ firstDoseTime: e.target.value })} />
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {value.times.map((t, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1">
                  <label htmlFor={id(`t${i}`)} className="field-label">Horário {i + 1}</label>
                  <input id={id(`t${i}`)} type="time" className="field" value={t}
                    onChange={(e) => set({ times: value.times.map((x, j) => (j === i ? e.target.value : x)) })} />
                </div>
                <button type="button" className="btn-ghost !px-3" aria-label={`Remover horário ${i + 1}`}
                  onClick={() => set({ times: value.times.filter((_, j) => j !== i) })}>
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            ))}
            <button type="button" className="btn-ghost w-full" onClick={() => set({ times: [...value.times, '12:00'] })}>
              <Plus className="h-5 w-5" aria-hidden="true" /> Adicionar horário
            </button>
          </div>
        )}
        {hint(flags.schedule)}
        {previewText(value) && (
          <p className="mt-3 rounded-lg bg-brand-50 p-3 text-base font-semibold text-brand-800" aria-live="polite">
            {previewText(value)}
          </p>
        )}
      </fieldset>

      <fieldset className={`rounded-xl border-2 p-3 ${flags.duration ? 'border-amber-600 bg-amber-50' : 'border-slate-300'}`}>
        <legend className="px-1 text-base font-semibold">Período do tratamento</legend>
        <div>
          <label htmlFor={id('start')} className="field-label">Começa em</label>
          <input id={id('start')} type="date" className="field" value={value.startDate} onChange={(e) => set({ startDate: e.target.value })} />
        </div>
        <div className="mt-3">
          <label htmlFor={id('mode')} className="field-label">Até quando?</label>
          <select id={id('mode')} className="field" value={mode}
            onChange={(e) => {
              const v = e.target.value as EndMode;
              if (v === 'continuous') set({ continuous: true, durationDays: undefined, endDate: undefined });
              else if (v === 'days') set({ continuous: false, durationDays: value.durationDays || 7, endDate: undefined });
              else set({ continuous: false, durationDays: undefined, endDate: value.endDate || value.startDate });
            }}>
            <option value="days">Por alguns dias</option>
            <option value="date">Até uma data</option>
            <option value="continuous">Uso contínuo (sem data final)</option>
          </select>
        </div>
        {mode === 'days' && (
          <div className="mt-3">
            <label htmlFor={id('days')} className="field-label">Quantos dias</label>
            <input id={id('days')} type="number" min={1} inputMode="numeric" className="field" value={value.durationDays ?? ''}
              onChange={(e) => set({ durationDays: e.target.value ? Number(e.target.value) : undefined })} />
          </div>
        )}
        {mode === 'date' && (
          <div className="mt-3">
            <label htmlFor={id('end')} className="field-label">Último dia</label>
            <input id={id('end')} type="date" className="field" value={value.endDate ?? ''} min={value.startDate}
              onChange={(e) => set({ endDate: e.target.value || undefined })} />
          </div>
        )}
        {hint(flags.duration)}
      </fieldset>

      <div>
        <label htmlFor={id('presc')} className="field-label">Médico (opcional)</label>
        <input id={id('presc')} className="field" value={value.prescriber ?? ''} onChange={(e) => set({ prescriber: e.target.value })} />
      </div>
      <div>
        <label htmlFor={id('notes')} className="field-label">Observações (opcional)</label>
        <textarea id={id('notes')} rows={2} className="field" value={value.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
      </div>
    </div>
  );
}
