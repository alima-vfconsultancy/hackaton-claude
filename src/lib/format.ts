import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Medication } from '../types';
import { joinPt, parseDate } from './schedule';

export const fmtTime = (ts: number) => format(new Date(ts), 'HH:mm');
export const fmtDateTime = (ts: number) => format(new Date(ts), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
export const fmtDate = (s?: string) => (s ? format(parseDate(s), 'dd/MM/yyyy') : '—');
export const fmtDayLong = (d: Date) => format(d, "EEEE, d 'de' MMMM", { locale: ptBR });

export function doseLabel(m: Pick<Medication, 'dosage' | 'unit'>): string {
  return [m.dosage, m.unit].filter(Boolean).join(' ');
}

export function frequencyLabel(m: Pick<Medication, 'scheduleType' | 'intervalHours' | 'times'>): string {
  if (m.scheduleType === 'interval') return m.intervalHours ? `De ${m.intervalHours} em ${m.intervalHours} horas` : '—';
  const t = [...m.times].sort();
  return t.length ? `Às ${joinPt(t)}` : '—';
}

export function periodLabel(m: Pick<Medication, 'startDate' | 'endDate' | 'continuous'>): string {
  const end = m.continuous ? 'uso contínuo' : m.endDate ? fmtDate(m.endDate) : 'sem data de término';
  return `${fmtDate(m.startDate)} até ${end}`;
}

export const STATUS_MED: Record<Medication['status'], string> = {
  active: 'Em uso',
  paused: 'Pausado',
  finished: 'Encerrado',
};
