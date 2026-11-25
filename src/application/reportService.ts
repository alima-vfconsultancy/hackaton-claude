import { endOfDay } from 'date-fns';
import { matchesTreatmentFilter, overlapsPeriod, type TreatmentFilter } from '../domain/adherence';
import type { DoseLog } from '../domain/dose';
import type { Medication } from '../domain/medication';
import { parseLocalDate, type LocalDate } from '../domain/time';
import type { GeneratedPdf, PdfReportGenerator, StoragePorts } from './ports';

export interface ReportSelection {
  medications: Medication[];
  doses: DoseLog[];
  from: LocalDate;
  to: LocalDate;
  filter: TreatmentFilter;
}

/**
 * Chooses what goes into the report: medications of the requested kind that overlap the period
 * (by name), and the doses of those medications scheduled inside the period (by time).
 */
export function selectReportData(input: ReportSelection): Pick<ReportSelection, 'medications' | 'doses'> {
  const medications = input.medications
    .filter((medication) => matchesTreatmentFilter(medication, input.filter) && overlapsPeriod(medication, input.from, input.to))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const ids = new Set(medications.map((medication) => medication.id));
  const start = parseLocalDate(input.from).getTime();
  const end = endOfDay(parseLocalDate(input.to)).getTime();
  const doses = input.doses
    .filter((dose) => ids.has(dose.medicationId) && dose.scheduledAt >= start && dose.scheduledAt <= end)
    .sort((a, b) => a.scheduledAt - b.scheduledAt);
  return { medications, doses };
}

export interface ReportOptions {
  from: LocalDate;
  to: LocalDate;
  filter: TreatmentFilter;
  includeDoses: boolean;
}

export interface ReportService {
  /** Builds the PDF history for the chosen period. */
  generatePdf(options: ReportOptions): Promise<GeneratedPdf>;
}

/** Builds the report use case; the PDF itself is produced by the given generator port. */
export function createReportService(ports: StoragePorts, pdf: PdfReportGenerator): ReportService {
  return {
    async generatePdf({ from, to, filter, includeDoses }) {
      const [medications, doses] = await Promise.all([ports.medications.list(), ports.doses.listAll()]);
      const selected = selectReportData({ medications, doses, from, to, filter });
      return pdf.generate({ ...selected, from, to, includeDoses });
    },
  };
}
