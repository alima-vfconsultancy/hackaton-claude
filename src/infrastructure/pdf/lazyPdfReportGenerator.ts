import type { PdfReportGenerator } from '../../application/ports';

/** Loads jsPDF only when a report is requested, keeping it out of the main bundle. */
export const createLazyPdfReportGenerator = (): PdfReportGenerator => ({
  async generate(request) {
    const { generateJsPdfReport } = await import('./jsPdfReportGenerator');
    return generateJsPdfReport(request);
  },
});
