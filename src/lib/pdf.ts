import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { endOfDay, format } from 'date-fns';
import type { DoseLog, Medication } from '../types';
import { DISCLAIMER } from '../types';
import { doseLabel, fmtDate, frequencyLabel, STATUS_MED } from './format';
import { doseStatusText } from './doseStatusText';
import { matchesMedFilter, overlapsPeriod, type MedFilter } from './adherence';
import { parseDate } from './schedule';

export interface PdfOptions {
  meds: Medication[];
  doses: DoseLog[];
  from: string; // yyyy-MM-dd
  to: string;
  filter: MedFilter;
  includeDoses: boolean;
  generatedAt?: Date;
}

/** Seleciona o que entra no PDF (puro; testável). */
export function selectForPdf(o: Pick<PdfOptions, 'meds' | 'doses' | 'from' | 'to' | 'filter'>) {
  const meds = o.meds
    .filter((m) => matchesMedFilter(m, o.filter) && overlapsPeriod(m, o.from, o.to))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const ids = new Set(meds.map((m) => m.id));
  const start = parseDate(o.from).getTime();
  const end = endOfDay(parseDate(o.to)).getTime();
  const doses = o.doses
    .filter((d) => ids.has(d.medicationId) && d.scheduledAt >= start && d.scheduledAt <= end)
    .sort((a, b) => a.scheduledAt - b.scheduledAt);
  return { meds, doses };
}

export function buildPdf(o: PdfOptions): jsPDF {
  const { meds, doses } = selectForPdf(o);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 15;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const generated = o.generatedAt ?? new Date();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0);
  doc.text('MeuRemédio - Histórico de medicamentos', margin, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Gerado em ${format(generated, 'dd/MM/yyyy HH:mm')}`, margin, 27);
  doc.text(`Período: ${fmtDate(o.from)} a ${fmtDate(o.to)}`, margin, 33);

  const common = {
    theme: 'grid' as const,
    styles: { font: 'helvetica', fontSize: 10, textColor: 0, lineColor: 0, lineWidth: 0.2, cellPadding: 2 },
    headStyles: { fillColor: [225, 225, 225] as [number, number, number], textColor: 0, fontStyle: 'bold' as const },
    margin: { left: margin, right: margin, bottom: 22 },
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Medicamentos', margin, 43);

  if (meds.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Nenhum medicamento neste período.', margin, 50);
  }
  autoTable(doc, {
    ...common,
    startY: 46,
    head: [['Nome', 'Dosagem', 'Frequência', 'Início', 'Fim', 'Status']],
    body: meds.map((m) => [
      m.name,
      doseLabel(m) || '-',
      frequencyLabel(m),
      fmtDate(m.startDate),
      m.continuous ? 'Contínuo' : fmtDate(m.endDate),
      STATUS_MED[m.status],
    ]),
  });

  if (o.includeDoses) {
    const byId = new Map(meds.map((m) => [m.id, m]));
    const lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 46;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    const y = lastY + 12 > pageH - 40 ? (doc.addPage(), 20) : lastY + 10;
    doc.text('Registro de doses', margin, y);
    autoTable(doc, {
      ...common,
      startY: y + 3,
      head: [['Data e hora', 'Medicamento', 'Situação', 'Tomada às']],
      body: doses.length
        ? doses.map((d) => [
            format(d.scheduledAt, 'dd/MM/yyyy HH:mm'),
            byId.get(d.medicationId)?.name ?? '-',
            doseStatusText(d.status),
            d.takenAt ? format(d.takenAt, 'dd/MM HH:mm') : '-',
          ])
        : [['Nenhuma dose registrada neste período.', '', '', '']],
    });
  }

  // Rodapé com o aviso de segurança + numeração, em todas as páginas.
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(0);
    doc.line(margin, pageH - 20, pageW - margin, pageH - 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(0);
    doc.text(doc.splitTextToSize(DISCLAIMER, pageW - margin * 2 - 20), margin, pageH - 15);
    doc.text(`Página ${i} de ${pages}`, pageW - margin, pageH - 15, { align: 'right' });
  }
  return doc;
}

