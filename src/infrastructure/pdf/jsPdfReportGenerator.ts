import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { GeneratedPdf, PdfReportRequest } from '../../application/ports';
import { DISCLAIMER, DOSE_STATUS_LABELS, TREATMENT_STATUS_LABELS } from '../../shared/ptBR/labels';
import { describeFrequency, formatDate, formatDosage } from '../../shared/ptBR/format';

/** Builds the A4 history document (Portuguese content, high-contrast black on white). */
export function buildPdfDocument(request: PdfReportRequest): jsPDF {
  const { medications, doses } = request;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const generatedAt = request.generatedAt ?? new Date();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0);
  doc.text('MeuRemédio - Histórico de medicamentos', margin, 20);
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
