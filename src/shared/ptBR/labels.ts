import type { DoseStatus } from '../../domain/dose';
import type { DosageUnit, MedicationForm, TreatmentStatus } from '../../domain/medication';

/** Safety notice shown on the Today page, the review, the form and the PDF footer. */
export const DISCLAIMER =
  'Este app é um organizador e não substitui a orientação do seu médico ou farmacêutico. Confira sempre os dados com a receita.';

export const DOSE_STATUS_LABELS: Record<DoseStatus, string> = {
  pending: 'Pendente',
  taken: 'Tomada',
  skipped: 'Pulada',
  missed: 'Perdida',
  snoozed: 'Adiada',
};

export const TREATMENT_STATUS_LABELS: Record<TreatmentStatus, string> = {
  active: 'Em uso',
  paused: 'Pausado',
  finished: 'Encerrado',
};

export const MEDICATION_FORM_LABELS: Record<MedicationForm, string> = {
  tablet: 'comprimido',
  capsule: 'cápsula',
  liquid: 'líquido',
  drops: 'gotas',
  ointment: 'pomada',
  injection: 'injeção',
  other: 'outro',
};

export const DOSAGE_UNIT_LABELS: Record<DosageUnit, string> = {
  mg: 'mg',
  g: 'g',
  mcg: 'mcg',
  ml: 'ml',
  iu: 'UI',
  percent: '%',
  drops: 'gotas',
  tablets: 'comprimido(s)',
  capsules: 'cápsula(s)',
  ampoules: 'ampola(s)',
  spoonfuls: 'colher(es)',
  sachets: 'sachê(s)',
  applications: 'aplicação',
  other: 'outro',
};
