import { describe, expect, it } from 'vitest';
import { buildPdf, selectForPdf } from './pdf';
import type { DoseLog, Medication } from '../types';

const med = (over: Partial<Medication>): Medication => ({
  id: 'm1', name: 'Amoxicilina', dosage: '500', unit: 'mg', form: 'cápsula', instructions: '',
  scheduleType: 'interval', intervalHours: 8, firstDoseTime: '08:00', times: [],
  startDate: '2026-03-10', endDate: '2026-03-16', continuous: false, status: 'finished',
  trackFrom: 0, createdAt: 0, updatedAt: 0, ...over,
});
const dose = (id: string, medicationId: string, d: number, h: number): DoseLog => ({
  id, medicationId, scheduledAt: new Date(2026, 2, d, h).getTime(), status: 'taken',
});

describe('selectForPdf', () => {
  const meds = [med({}), med({ id: 'm2', name: 'Losartana', status: 'active', continuous: true, endDate: undefined })];
  const doses = [dose('a', 'm1', 10, 8), dose('b', 'm1', 20, 8), dose('c', 'm2', 12, 8)];

  it('filtra por tipo (atuais / passados / todos)', () => {
    const base = { meds, doses, from: '2026-03-01', to: '2026-03-31' };
    expect(selectForPdf({ ...base, filter: 'current' }).meds.map((m) => m.id)).toEqual(['m2']);
    expect(selectForPdf({ ...base, filter: 'past' }).meds.map((m) => m.id)).toEqual(['m1']);
    expect(selectForPdf({ ...base, filter: 'all' }).meds).toHaveLength(2);
  });
  it('limita as doses ao período', () => {
    const r = selectForPdf({ meds, doses, from: '2026-03-10', to: '2026-03-15', filter: 'all' });
    expect(r.doses.map((d) => d.id)).toEqual(['a', 'c']);
  });
});

describe('buildPdf', () => {
  it('gera um PDF A4 com os dados', () => {
    const doc = buildPdf({
      meds: [med({})], doses: [dose('a', 'm1', 10, 8)], from: '2026-03-01', to: '2026-03-31',
      filter: 'all', includeDoses: true, generatedAt: new Date(2026, 2, 31),
    });
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    const w = doc.internal.pageSize.getWidth();
    expect(Math.round(w)).toBe(210);
    expect(doc.output('arraybuffer').byteLength).toBeGreaterThan(1000);
  });
});
