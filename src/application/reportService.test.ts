import { describe, expect, it, vi } from 'vitest';
import type { DoseLog } from '../domain/dose';
import type { GeneratedPdf, PdfReportGenerator } from './ports';
import { buildMedication, createInMemoryPorts } from './testing/inMemoryPorts';
import { createReportService, selectReportData } from './reportService';

const finished = buildMedication({ status: 'finished' });
const continuous = buildMedication({ id: 'm2', name: 'Losartana', status: 'active', period: { startDate: '2026-03-10' } });
const dose = (id: string, medicationId: string, day: number): DoseLog => ({
  id, medicationId, scheduledAt: new Date(2026, 2, day, 8).getTime(), status: 'taken',
});
const doses = [dose('a', 'med-1', 10), dose('b', 'med-1', 20), dose('c', 'm2', 12)];

describe('selectReportData', () => {
  const base = { medications: [finished, continuous], doses, from: '2026-03-01', to: '2026-03-31' };

  it('filters medications by kind (current, past, all)', () => {
    expect(selectReportData({ ...base, filter: 'current' }).medications.map((m) => m.id)).toEqual(['m2']);
    expect(selectReportData({ ...base, filter: 'past' }).medications.map((m) => m.id)).toEqual(['med-1']);
    expect(selectReportData({ ...base, filter: 'all' }).medications).toHaveLength(2);
  });

  it('keeps only the doses inside the period, in chronological order', () => {
    const result = selectReportData({ ...base, from: '2026-03-10', to: '2026-03-15', filter: 'all' });
    expect(result.doses.map((d) => d.id)).toEqual(['a', 'c']);
  });

  it('orders medications by name', () => {
    const names = selectReportData({ ...base, filter: 'all' }).medications.map((m) => m.name);
    expect(names).toEqual(['Amoxicilina', 'Losartana']);
  });
});

describe('ReportService', () => {
  it('hands the selected data to the PDF generator', async () => {
    const generated: GeneratedPdf = { pageCount: 1, save: vi.fn(), toBlob: () => new Blob() };
    const generate = vi.fn<PdfReportGenerator['generate']>().mockResolvedValue(generated);
    const ports = createInMemoryPorts({ medications: [finished, continuous], doses });

    const result = await createReportService(ports, { generate }).generatePdf({
      from: '2026-03-10', to: '2026-03-15', filter: 'past', includeDoses: true,
    });

    expect(result).toBe(generated);
    const request = generate.mock.calls[0][0];
    expect(request.medications.map((m) => m.id)).toEqual(['med-1']);
    expect(request.doses.map((d) => d.id)).toEqual(['a']);
    expect(request).toMatchObject({ from: '2026-03-10', to: '2026-03-15', includeDoses: true });
  });
});
