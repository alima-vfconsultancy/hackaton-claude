import { useId } from 'react';
import { Plus, X } from 'lucide-react';
import { DOSAGE_UNITS, MEDICATION_FORMS, type MedicationForm as MedicationFormKind, type ScheduleType } from '../../domain/medication';
import { describeSchedulePreview, formatDosageUnit } from '../../shared/ptBR/format';
import { MEDICATION_FORM_LABELS } from '../../shared/ptBR/labels';
import { buildMedicationDraft, type EndMode, type MedicationFormValues } from '../forms/medicationFormValues';

/** Fields the OCR was unsure about (highlighted so the user double-checks them). */
export interface FieldFlags {
  name?: boolean;
  dosage?: boolean;
  schedule?: boolean;
  duration?: boolean;
}

const SCHEDULE_OPTIONS: Array<[ScheduleType, string]> = [['interval', 'De X em X horas'], ['fixedTimes', 'Horários fixos']];

/** Form to create or edit a medication; it only edits state, saving is up to the page. */
export function MedicationForm({
  value,
  onChange,
  flags = {},
}: {
  value: MedicationFormValues;
  onChange: (value: MedicationFormValues) => void;
  flags?: FieldFlags;
}) {
  const uniqueId = useId();
  const fieldId = (name: string) => `${uniqueId}-${name}`;
  const set = (patch: Partial<MedicationFormValues>) => onChange({ ...value, ...patch });
  const warn = (isUncertain?: boolean) => (isUncertain ? 'field-warn' : '');
  const hint = (isUncertain?: boolean) =>
    isUncertain ? <p className="mt-1 text-sm font-semibold text-amber-900">⚠ Leitura incerta. Confira com a receita.</p> : null;
  const schedulePreview = describeSchedulePreview(buildMedicationDraft(value).draft.schedule);
  const unitOptions = [...new Set([...DOSAGE_UNITS, value.dosageUnit])];

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={fieldId('name')} className="field-label">Nome do remédio *</label>
        <input id={fieldId('name')} className={`field ${warn(flags.name)}`} value={value.name} autoComplete="off"
          onChange={(event) => set({ name: event.target.value })} placeholder="Ex.: Amoxicilina" />
        {hint(flags.name)}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={fieldId('dosage')} className="field-label">Dosagem</label>
          <input id={fieldId('dosage')} className={`field ${warn(flags.dosage)}`} value={value.dosageAmount} inputMode="decimal"
            onChange={(event) => set({ dosageAmount: event.target.value })} placeholder="500" />
        </div>
        <div>
          <label htmlFor={fieldId('unit')} className="field-label">Unidade</label>
          <select id={fieldId('unit')} className={`field ${warn(flags.dosage)}`} value={value.dosageUnit}
            onChange={(event) => set({ dosageUnit: event.target.value as MedicationFormValues['dosageUnit'], dosagePerMl: undefined })}>
            {unitOptions.map((unit) => (
              <option key={unit} value={unit}>{formatDosageUnit(unit, unit === value.dosageUnit ? value.dosagePerMl : undefined)}</option>
            ))}
          </select>
        </div>
      </div>
      {hint(flags.dosage)}

      <div>
        <label htmlFor={fieldId('form')} className="field-label">Forma</label>
        <select id={fieldId('form')} className="field" value={value.form} onChange={(event) => set({ form: event.target.value as MedicationFormKind })}>
          {MEDICATION_FORMS.map((form) => <option key={form} value={form}>{MEDICATION_FORM_LABELS[form]}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor={fieldId('instructions')} className="field-label">Como tomar (opcional)</label>
        <input id={fieldId('instructions')} className="field" value={value.instructions}
          onChange={(event) => set({ instructions: event.target.value })} placeholder="Ex.: após as refeições" />
      </div>

      <fieldset className={`rounded-xl border-2 p-3 ${flags.schedule ? 'border-amber-600 bg-amber-50' : 'border-slate-300'}`}>
        <legend className="px-1 text-base font-semibold">Com que frequência?</legend>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de frequência">
          {SCHEDULE_OPTIONS.map(([type, label]) => (
            <button key={type} type="button" role="radio" aria-checked={value.scheduleType === type}
              onClick={() => set({ scheduleType: type })}
              className={`btn ${value.scheduleType === type ? 'bg-brand-700 text-white' : 'border-2 border-slate-400 bg-white text-slate-900'}`}>
              {label}
            </button>
          ))}
        </div>

        {value.scheduleType === 'interval' ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={fieldId('hours')} className="field-label">A cada quantas horas</label>
              <input id={fieldId('hours')} type="number" min={1} max={168} inputMode="numeric" className="field"
                value={value.intervalHours ?? ''}
                onChange={(event) => set({ intervalHours: event.target.value ? Number(event.target.value) : undefined })} />
            </div>
            <div>
              <label htmlFor={fieldId('first-dose')} className="field-label">Primeira dose às</label>
              <input id={fieldId('first-dose')} type="time" className="field" value={value.firstDoseTime}
                onChange={(event) => set({ firstDoseTime: event.target.value })} />
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {value.times.map((time, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="flex-1">
                  <label htmlFor={fieldId(`time-${index}`)} className="field-label">Horário {index + 1}</label>
                  <input id={fieldId(`time-${index}`)} type="time" className="field" value={time}
                    onChange={(event) => set({ times: value.times.map((current, i) => (i === index ? event.target.value : current)) })} />
                </div>
                <button type="button" className="btn-ghost !px-3" aria-label={`Remover horário ${index + 1}`}
                  onClick={() => set({ times: value.times.filter((_, i) => i !== index) })}>
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
        {schedulePreview && (
          <p className="mt-3 rounded-lg bg-brand-50 p-3 text-base font-semibold text-brand-800" aria-live="polite">
            {schedulePreview}
          </p>
        )}
      </fieldset>

      <fieldset className={`rounded-xl border-2 p-3 ${flags.duration ? 'border-amber-600 bg-amber-50' : 'border-slate-300'}`}>
        <legend className="px-1 text-base font-semibold">Período do tratamento</legend>
        <div>
          <label htmlFor={fieldId('start')} className="field-label">Começa em</label>
          <input id={fieldId('start')} type="date" className="field" value={value.startDate}
            onChange={(event) => set({ startDate: event.target.value })} />
        </div>
        <div className="mt-3">
          <label htmlFor={fieldId('end-mode')} className="field-label">Até quando?</label>
          <select id={fieldId('end-mode')} className="field" value={value.endMode}
            onChange={(event) => {
              const endMode = event.target.value as EndMode;
              if (endMode === 'days') set({ endMode, durationDays: value.durationDays || 7 });
              else if (endMode === 'date') set({ endMode, endDate: value.endDate || value.startDate });
              else set({ endMode });
            }}>
            <option value="days">Por alguns dias</option>
            <option value="date">Até uma data</option>
            <option value="continuous">Uso contínuo (sem data final)</option>
          </select>
        </div>
        {value.endMode === 'days' && (
          <div className="mt-3">
            <label htmlFor={fieldId('days')} className="field-label">Quantos dias</label>
            <input id={fieldId('days')} type="number" min={1} inputMode="numeric" className="field" value={value.durationDays ?? ''}
              onChange={(event) => set({ durationDays: event.target.value ? Number(event.target.value) : undefined })} />
          </div>
        )}
        {value.endMode === 'date' && (
          <div className="mt-3">
            <label htmlFor={fieldId('end')} className="field-label">Último dia</label>
            <input id={fieldId('end')} type="date" className="field" value={value.endDate} min={value.startDate}
              onChange={(event) => set({ endDate: event.target.value })} />
          </div>
        )}
        {hint(flags.duration)}
      </fieldset>

      <div>
        <label htmlFor={fieldId('prescriber')} className="field-label">Médico (opcional)</label>
        <input id={fieldId('prescriber')} className="field" value={value.prescriber} onChange={(event) => set({ prescriber: event.target.value })} />
      </div>
      <div>
        <label htmlFor={fieldId('notes')} className="field-label">Observações (opcional)</label>
        <textarea id={fieldId('notes')} rows={2} className="field" value={value.notes} onChange={(event) => set({ notes: event.target.value })} />
      </div>
    </div>
  );
}
