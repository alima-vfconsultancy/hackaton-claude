import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { GeneratedPdf, PdfReportRequest } from '../../application/ports';
import { APP_NAME, BRAND_COLORS } from '../../shared/brand';
import { DISCLAIMER, DOSE_STATUS_LABELS, TREATMENT_STATUS_LABELS } from '../../shared/ptBR/labels';
import { describeFrequency, formatDate, formatDosage } from '../../shared/ptBR/format';

type Point = [number, number];

const hexToRgb = (hex: string): [number, number, number] =>
  [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)) as [number, number, number];

/**
 * Draws the monochrome brand symbol (graphite capsule with a check, see scripts/brand-symbol.mjs) so the
 * printed report stays readable in black and white. Geometry in the 512 frame, scaled to `size` mm.
 */
function drawMonochromeSymbol(doc: jsPDF, left: number, top: number, size: number) {
  const [r, g, b] = hexToRgb(BRAND_COLORS.graphite);
  const scale = size / 368; // the symbol occupies 72..440 of the 512 frame
  const toPage = ([x, y]: Point): Point => [left + (x - 72) * scale, top + (y - 72) * scale];
  // The capsule is horizontal around (256, 256) and then rotated -45°.
  const rotate = ([x, y]: Point): Point => [256 + (x + y) * Math.SQRT1_2, 256 + (y - x) * Math.SQRT1_2];
  // Half of the capsule: direction 1 is the upper-right half, -1 the lower-left one (relative to the center).
  const half = (direction: 1 | -1): Point[] => {
    const points: Point[] = [[0, -96]];
    for (let step = 0; step <= 24; step++) {
      const angle = -Math.PI / 2 + (direction * Math.PI * step) / 24;
      points.push([direction * 111.5 + 96 * Math.cos(angle), 96 * Math.sin(angle)]);
    }
    points.push([0, 96]);
    return points.map(([x, y]) => toPage(rotate([x, y])));
  };
  const drawPolygon = (points: Point[], style: 'F' | 'FD') => {
    const segments = points.slice(1).map(([x, y], index) => [x - points[index][0], y - points[index][1]]);
    doc.lines(segments, points[0][0], points[0][1], [1, 1], style, true);
  };

  doc.setDrawColor(r, g, b);
  doc.setFillColor(r, g, b);
  doc.setLineWidth(16 * scale);
  drawPolygon(half(-1), 'F');
  doc.setFillColor(255, 255, 255);
  drawPolygon(half(1), 'FD');
  doc.setLineCap('round');
  doc.setLineJoin('round');
  doc.setLineWidth(24 * scale);
  const check = ([[260, 224], [288, 250], [334, 192]] as Point[]).map(toPage);
  doc.lines(check.slice(1).map(([x, y], index) => [x - check[index][0], y - check[index][1]]), check[0][0], check[0][1], [1, 1], 'S', false);
  // Reset for the tables.
  doc.setDrawColor(0);
  doc.setLineWidth(0.2);
  doc.setLineCap('butt');
  doc.setLineJoin('miter');
}

/** Builds the A4 history document (Portuguese content, high-contrast black on white). */
export function buildPdfDocument(request: PdfReportRequest): jsPDF {
  const { medications, doses } = request;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const generatedAt = request.generatedAt ?? new Date();

  drawMonochromeSymbol(doc, margin, 12, 11);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0);
  doc.text(`${APP_NAME} - Histórico de medicamentos`, margin + 14, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Gerado em ${format(generatedAt, 'dd/MM/yyyy HH:mm')}`, margin, 27);
  doc.text(`Período: ${formatDate(request.from)} a ${formatDate(request.to)}`, margin, 33);

  const common = {
    theme: 'grid' as const,
    styles: { font: 'helvetica', fontSize: 10, textColor: 0, lineColor: 0, lineWidth: 0.2, cellPadding: 2 },
    headStyles: { fillColor: [225, 225, 225] as [number, number, number], textColor: 0, fontStyle: 'bold' as const },
    margin: { left: margin, right: margin, bottom: 22 },
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Medicamentos', margin, 43);

  if (medications.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Nenhum medicamento neste período.', margin, 50);
  }
  autoTable(doc, {
    ...common,
    startY: 46,
    head: [['Nome', 'Dosagem', 'Frequência', 'Início', 'Fim', 'Status']],
    body: medications.map((medication) => [
      medication.name,
      formatDosage(medication.dosage) || '-',
      describeFrequency(medication.schedule),
      formatDate(medication.period.startDate),
      medication.period.endDate ? formatDate(medication.period.endDate) : 'Contínuo',
      TREATMENT_STATUS_LABELS[medication.status],
    ]),
  });

  if (request.includeDoses) {
    const nameById = new Map(medications.map((medication) => [medication.id, medication.name]));
    const lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 46;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const y = lastY + 12 > pageHeight - 40 ? (doc.addPage(), 20) : lastY + 10;
    doc.text('Registro de doses', margin, y);
    autoTable(doc, {
      ...common,
      startY: y + 3,
      head: [['Data e hora', 'Medicamento', 'Situação', 'Tomada às']],
      body: doses.length
        ? doses.map((dose) => [
            format(dose.scheduledAt, 'dd/MM/yyyy HH:mm'),
            nameById.get(dose.medicationId) ?? '-',
            DOSE_STATUS_LABELS[dose.status],
            dose.takenAt ? format(dose.takenAt, 'dd/MM HH:mm') : '-',
          ])
        : [['Nenhuma dose registrada neste período.', '', '', '']],
    });
  }

  // Footer with the safety notice and page numbers, on every page.
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor(0);
    doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(0);
    doc.text(doc.splitTextToSize(DISCLAIMER, pageWidth - margin * 2 - 20), margin, pageHeight - 15);
    doc.text(`Página ${page} de ${pages}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
  }
  return doc;
}

/**
 * Generates the PDF history.
 * @param request - already filtered medications and doses, plus the period shown in the header
 */
export async function generateJsPdfReport(request: PdfReportRequest): Promise<GeneratedPdf> {
  const doc = buildPdfDocument(request);
  return {
    pageCount: doc.getNumberOfPages(),
    save: (fileName) => void doc.save(fileName),
    toBlob: () => doc.output('blob'),
  };
}
