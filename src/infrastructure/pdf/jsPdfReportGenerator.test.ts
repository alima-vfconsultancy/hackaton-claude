import { describe, expect, it } from 'vitest';
import { buildDose, buildMedication } from '../../application/testing/inMemoryPorts';
import { buildPdfDocument, generateJsPdfReport } from './jsPdfReportGenerator';

const request = {
  medications: [buildMedication({ status: 'finished' })],
  doses: [buildDose({ status: 'taken', scheduledAt: new Date(2026, 2, 10, 8).getTime() })],
  from: '2026-03-01',
  to: '2026-03-31',
  includeDoses: true,
  generatedAt: new Date(2026, 2, 31),
};

describe('buildPdfDocument', () => {
  it('builds an A4 document', () => {
    const doc = buildPdfDocument(request);
    expect(Math.round(doc.internal.pageSize.getWidth())).toBe(210);
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it('adds a second page when the dose log does not fit after a long medication table', () => {
    const many = Array.from({ length: 40 }, (_, i) => buildMedication({ id: `m${i}`, name: `Medicamento ${i}` }));
    expect(buildPdfDocument({ ...request, medications: many }).getNumberOfPages()).toBeGreaterThan(1);
  });
});

describe('generateJsPdfReport', () => {
  it('returns a PDF that can be saved or shared as a blob', async () => {
    const pdf = await generateJsPdfReport(request);
    expect(pdf.pageCount).toBeGreaterThanOrEqual(1);
    expect(pdf.toBlob().size).toBeGreaterThan(1000);
  });

  it('works without the dose log and with no medications', async () => {
    const pdf = await generateJsPdfReport({ ...request, medications: [], doses: [], includeDoses: false });
    expect(pdf.pageCount).toBe(1);
  });
});
