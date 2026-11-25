/**
 * Reads the raw OCR text of a prescription and SUGGESTS medications.
 * Pure module (no React/DOM). The result is NEVER saved directly:
 * it always goes through the review screen (see CLAUDE.md, safety rules).
 * The patterns below match Brazilian Portuguese prescriptions on purpose.
 */
import type { Dosage, DosageUnit, MedicationDraft, MedicationForm, Schedule } from '../domain/medication';
import { computeEndDate } from '../domain/schedule';
import type { LocalDate, LocalTime } from '../domain/time';
import { DOSAGE_UNIT_LABELS } from '../shared/ptBR/labels';

export type Confidence = 'high' | 'low';

/** Treatment length read from the prescription. */
export type SuggestedDuration = { type: 'days'; days: number } | { type: 'continuous' };

/** What the parser could read for one medication. It is only a suggestion until the user confirms it. */
export interface PrescriptionSuggestion {
  name: string;
  dosage: Dosage | null;
  form: MedicationForm;
  instructions: string;
  /** `null` when the prescription gives no frequency. */
  schedule: Schedule | null;
  /** `null` when the prescription gives no duration. */
  duration: SuggestedDuration | null;
  prescriber?: string;
  confidence: { name: Confidence; dosage: Confidence; schedule: Confidence; duration: Confidence };
  /** Text excerpt the suggestion came from (for auditing and double-checking). */
  rawText: string;
}

const strip = (s: string) => s.normalize('NFC').normalize('NFD').replace(/[̀-ͯ]/g, '');

const NUMBER_WORDS: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, seis: 6, meio: 0.5, meia: 0.5 };

// Suggested fixed times for "N times a day" (always flagged as low confidence).
const DEFAULT_TIMES: Record<number, LocalTime[]> = {
  1: ['08:00'],
  2: ['08:00', '20:00'],
  3: ['08:00', '14:00', '20:00'],
  4: ['08:00', '12:00', '16:00', '20:00'],
  5: ['06:00', '10:00', '14:00', '18:00', '22:00'],
  6: ['06:00', '10:00', '14:00', '18:00', '22:00', '02:00'],
};

const NOISE =
  /\b(crm|cpf|rg|cnpj|telefone|fone|tel|paciente|receituario|assinatura|endereco|cep|conselho|carimbo|validade|data|rua|avenida|clinica|consultorio|nome)\b/;
const POSOLOGY_START =
  /^(tomar|tome|tomando|usar|use|aplicar|aplique|ingerir|ingira|administrar|pingar|pingue|via|uso|diluir|beber|mastigar|dissolver|manter|repetir|se |em caso|de |por |durante|a cada|cada |apos|antes|em jejum|ao |a noite|pela|pelo|com |junto|\d+\s*(x|vez|vezes|comprimidos?|comp\b|cp\b|capsulas?|caps\b|gotas?|ml\b|colher|ampola|sache|dias?)|uma? |duas |tres |quatro |meio |meia )/;
const NUMBERING = /^\s*(?:\d{1,2}\s*[.)\-–]\s+|[-•*·]\s+)/;
const FORM_PREFIX = /^(comprimidos?|comp\.?|cp\.?|capsulas?|caps\.?|xarope|solucao|sol\.?|suspensao|gotas|pomada|creme|gel|injetavel|ampola|colirio|spray)\s+/;

const STRENGTH = /(\d+(?:[.,]\d+)?)\s*(mg|mcg|ug|µg|g|ui|%)(?:\s*\/\s*(\d+(?:[.,]\d+)?)?\s*(ml))?(?![a-z])/;
const QUANTITY =
  /(\d+(?:[.,]\d+)?|um|uma|meio|meia|dois|duas)\s*(gotas?|comprimidos?|comp\b|cp\b|capsulas?|caps\b|ampolas?|ml\b|colher(?:es)?(?: de (?:sopa|cha|sobremesa))?|aplicacao|aplicacoes|sache)/;

const STRENGTH_UNITS: Record<string, DosageUnit> = { mg: 'mg', mcg: 'mcg', ug: 'mcg', 'µg': 'mcg', g: 'g', ui: 'iu', '%': 'percent' };

function quantityUnit(raw: string): DosageUnit {
  if (raw.startsWith('gota')) return 'drops';
  if (/^(comprimido|comp|cp)/.test(raw)) return 'tablets';
  if (/^(capsula|caps)/.test(raw)) return 'capsules';
  if (raw.startsWith('ampola')) return 'ampoules';
  if (raw.startsWith('colher')) return 'spoonfuls';
  if (raw.startsWith('aplicac')) return 'applications';
  if (raw.startsWith('sache')) return 'sachets';
  return 'ml';
}

/** Reads "0,5", "500" or number words ("meio", "duas") as a number; `null` when it is not one. */
function parseAmount(raw: string): number | null {
  const fromWord = NUMBER_WORDS[raw];
  // "1.000" is one thousand in pt-BR, not 1.0.
  const text = /^\d{1,3}(\.\d{3})+$/.test(raw) ? raw.replace(/\./g, '') : raw.replace(',', '.');
  const value = fromWord !== undefined ? fromWord : parseFloat(text);
  return Number.isFinite(value) ? value : null;
}

/** "comprimido(s)" becomes "comprimido" for exactly one and "comprimidos" otherwise. */
function pluralize(label: string, amount: number): string {
  return label.replace(/\((e?s)\)/, amount === 1 ? '' : '$1');
}

function detectForm(norm: string): MedicationForm {
  if (/\b(comprimidos?|comp|cp)\b/.test(norm)) return 'tablet';
  if (/\b(capsulas?|caps)\b/.test(norm)) return 'capsule';
  if (/\b(gotas?)\b/.test(norm)) return 'drops';
  if (/\b(pomada|creme|gel)\b/.test(norm)) return 'ointment';
  if (/\b(injetavel|injecao|ampola|intramuscular|im)\b/.test(norm)) return 'injection';
  if (/\b(xarope|solucao|suspensao|liquido|ml)\b/.test(norm)) return 'liquid';
  return 'other';
}

// Instruction phrases written to the user's notes field (content in Portuguese on purpose).
const INSTRUCTIONS: Array<[RegExp, string]> = [
  [/\b(apos|depois d[aeo]s?) (as )?refeic/, 'após as refeições'],
  [/\bantes d[aeo]s? refeic/, 'antes das refeições'],
  [/\bcom (as )?refeic|junto com (os )?alimentos|com alimento/, 'junto com alimentos'],
  [/\bem jejum\b/, 'em jejum'],
  [/\b(ao deitar|antes de dormir)\b/, 'ao deitar'],
  [/\bcom (um copo de )?agua\b/, 'com água'],
  [/\buso (topico|externo)\b/, 'uso tópico'],
];

interface Frequency {
  schedule: Schedule | null;
  confidence: Confidence;
}

const DEFAULT_FIRST_DOSE: LocalTime = '08:00';
const everyHours = (intervalHours: number): Schedule => ({ type: 'interval', intervalHours, firstDoseTime: DEFAULT_FIRST_DOSE });
const atTimes = (times: LocalTime[]): Schedule => ({ type: 'fixedTimes', times });

function parseFrequency(norm: string): Frequency {
  // "de 8 em 8 horas", "8/8h", "8 / 8 horas"
  const repeated = norm.match(/(\d{1,2})\s*(?:em|\/)\s*(\d{1,2})\s*h(?:oras?|rs?)?\b/);
  if (repeated && repeated[1] === repeated[2] && +repeated[1] > 0 && +repeated[1] <= 48) {
    return { schedule: everyHours(+repeated[1]), confidence: 'high' };
  }
  // "a cada 12 horas"
  const each = norm.match(/cada\s+(\d{1,2})\s*h(?:oras?|rs?)?\b/);
  if (each && +each[1] > 0 && +each[1] <= 48) {
    return { schedule: everyHours(+each[1]), confidence: 'high' };
  }
  // "3x ao dia", "3 x/dia", "3 vezes por dia", "uma vez ao dia"
  const timesPerDay = norm.match(/(\d|um|uma|duas|dois|tres|quatro|cinco|seis)\s*(?:x|vez(?:es)?)\s*(?:ao|por|\/|no|a)?\s*dia/);
  if (timesPerDay) {
    const words: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6 };
    const count = words[timesPerDay[1]] ?? +timesPerDay[1];
    if (DEFAULT_TIMES[count]) return { schedule: atTimes(DEFAULT_TIMES[count]), confidence: 'low' };
  }
  if (/\b(diariamente|todo dia|todos os dias)\b/.test(norm)) return { schedule: atTimes(DEFAULT_TIMES[1]), confidence: 'low' };
  if (/\b(a noite|ao deitar|antes de dormir|a hora de dormir)\b/.test(norm)) return { schedule: atTimes(['22:00']), confidence: 'low' };
  if (/\b(pela manha|de manha|ao acordar)\b/.test(norm)) return { schedule: atTimes(['08:00']), confidence: 'low' };
  if (/\bem jejum\b/.test(norm)) return { schedule: atTimes(['07:00']), confidence: 'low' };
  return { schedule: null, confidence: 'low' };
}

function parseDuration(norm: string): { duration: SuggestedDuration | null; confidence: Confidence } {
  if (/\b(uso continuo|continuo|continuamente|uso prolongado)\b/.test(norm)) return { duration: { type: 'continuous' }, confidence: 'high' };
  const days = norm.match(/\b(?:por|durante|ate)\s+(\d{1,3})\s*dias?\b/) ?? norm.match(/\b(\d{1,3})\s*dias\b/);
  if (days && +days[1] > 0) return { duration: { type: 'days', days: +days[1] }, confidence: 'high' };
  const weeks = norm.match(/\b(?:por|durante)\s+(\d{1,2})\s*semanas?\b/);
  if (weeks) return { duration: { type: 'days', days: +weeks[1] * 7 }, confidence: 'high' };
  const months = norm.match(/\b(?:por|durante)\s+(\d{1,2}|um|uma)\s*mes(?:es)?\b/);
  if (months) return { duration: { type: 'days', days: (NUMBER_WORDS[months[1]] ?? +months[1]) * 30 }, confidence: 'low' };
  return { duration: null, confidence: 'low' };
}

function titleCase(s: string): string {
  const letters = s.replace(/[^A-Za-zÀ-ÿ]/g, '');
  const allCaps = letters.length > 0 && letters === letters.toUpperCase();
  const base = allCaps ? s.toLowerCase() : s;
  return base.replace(/(^|\s)(\p{L})/gu, (_, space, char) => space + char.toUpperCase());
}

function extractName(line: string): string {
  let rest = line.replace(NUMBERING, '').trim();
  for (let i = 0; i < 2; i++) {
    const match = strip(rest.toLowerCase()).match(FORM_PREFIX);
    if (match) rest = rest.slice(match[0].length);
  }
  const cut = rest.search(/\d|\s[-–—]\s|[,;:(]|\s(?:tomar|tome|usar|use|aplicar|aplique)\b/i);
  let name = (cut >= 0 ? rest.slice(0, cut) : rest).trim();
  name = name.replace(/\s+(de|em|com|da|do|gotas|comprimidos?|cp|xarope|cápsulas?)$/i, '').replace(/[^\p{L}\s'-]/gu, '').trim();
  name = name.split(/\s+/).slice(0, 4).join(' ');
  return name.length >= 3 ? titleCase(name) : '';
}

function isNoise(norm: string): boolean {
  if (norm.length < 3) return true;
  if (/^\W*\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\W*$/.test(norm)) return true;
  return NOISE.test(norm) && !STRENGTH.test(norm);
}

function startsMedication(line: string): boolean {
  const body = line.replace(NUMBERING, '');
  const norm = strip(body.toLowerCase()).trim();
  if (POSOLOGY_START.test(norm)) return false;
  if (NUMBERING.test(line) && /\p{L}{3,}/u.test(body)) return true;
  if (STRENGTH.test(norm) || FORM_PREFIX.test(norm)) return /\p{L}{3,}/u.test(body);
  return false;
}

function buildSuggestion(block: string[], prescriber?: string): PrescriptionSuggestion {
  const first = block[0];
  const text = block.join(' ');
  const norm = strip(text.toLowerCase());
  const firstNorm = strip(first.toLowerCase());

  const name = extractName(first);

  // Dosage: prefers the strength (500 mg); without it, falls back to the amount per intake (20 drops).
  let dosage: Dosage | null = null;
  let dosageConfidence: Confidence = 'low';
  let rest = norm;
  const strength = firstNorm.match(STRENGTH) ?? norm.match(STRENGTH);
  if (strength) {
    const amount = parseAmount(strength[1]);
    if (amount !== null) {
      dosage = { amount, unit: STRENGTH_UNITS[strength[2]] ?? 'other' };
      if (strength[4]) dosage.perMl = strength[3] ? parseAmount(strength[3]) ?? 1 : 1;
      dosageConfidence = 'high';
    }
    rest = norm.replace(strength[0], ' ');
  }
  const quantity = rest.match(QUANTITY);
  const extraInstructions: string[] = [];
  if (quantity) {
    const amount = parseAmount(quantity[1]);
    if (amount !== null) {
      const unit = quantityUnit(quantity[2]);
      if (!strength) {
        dosage = { amount, unit };
        dosageConfidence = 'low';
      } else {
        extraInstructions.push(`${String(amount).replace('.', ',')} ${pluralize(DOSAGE_UNIT_LABELS[unit], amount)} por vez`);
      }
    }
  }

  const frequency = parseFrequency(norm);
  const length = parseDuration(norm);

  const instructions = [...extraInstructions];
  for (const [pattern, label] of INSTRUCTIONS) if (pattern.test(norm) && !instructions.includes(label)) instructions.push(label);

  return {
    name,
    dosage,
    form: detectForm(norm),
    instructions: instructions.join(', '),
    schedule: frequency.schedule,
    duration: length.duration,
    prescriber,
    confidence: {
      name: name.length >= 4 && strength ? 'high' : 'low',
      dosage: dosageConfidence,
      schedule: frequency.confidence,
      duration: length.confidence,
    },
    rawText: text,
  };
}

/**
 * Reads the raw OCR text of a prescription and suggests one entry per medication found.
 * Pure function: it never stores anything; the result must go through the user's review.
 *
 * @param rawText - text recognized from the prescription photo (may be empty or noisy)
 * @returns suggestions in reading order; empty when no medication was recognized
 */
export function parsePrescription(rawText: string): PrescriptionSuggestion[] {
  const text = rawText.normalize('NFC');
  const doctor = text.match(/\b(?:dr|dra)\.?\s+([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+){0,2})/i);
  const doctorWords = doctor ? doctor[1].split(/\s+/) : [];
  const stop = doctorWords.findIndex((word) => /^(crm|cpf|rg|cro)$/i.test(word));
  const doctorName = (stop >= 0 ? doctorWords.slice(0, stop) : doctorWords).join(' ');
  const prescriber = doctor && doctorName ? `${/dra/i.test(doctor[0].slice(0, 3)) ? 'Dra.' : 'Dr.'} ${titleCase(doctorName)}` : undefined;

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const blocks: string[][] = [];
  for (const line of lines) {
    const norm = strip(line.toLowerCase());
    if (isNoise(norm)) continue;
    if (startsMedication(line)) blocks.push([line]);
    else if (blocks.length) blocks[blocks.length - 1].push(line);
    else if (!POSOLOGY_START.test(norm) && /\p{L}{3,}/u.test(line)) blocks.push([line]);
  }

  return blocks
    .map((block) => buildSuggestion(block, prescriber))
    .filter((suggestion) => suggestion.name && (suggestion.dosage || suggestion.schedule)); // drops blocks without any useful signal
}

/**
 * Turns a suggestion into a draft for the review form (nothing is saved here).
 * Missing data gets sensible defaults: every 8 hours from 08:00, for 7 days.
 *
 * @param suggestion - parser output
 * @param startDate - first day of the treatment
 * @param sourceOcrText - full OCR text, kept for auditing (defaults to the suggestion's excerpt)
 */
export function suggestionToDraft(
  suggestion: PrescriptionSuggestion,
  startDate: LocalDate,
  sourceOcrText?: string,
): MedicationDraft {
  const { duration } = suggestion;
  const period = duration?.type === 'continuous'
    ? { startDate }
    : { startDate, endDate: computeEndDate(startDate, duration?.days ?? 7) };
  return {
    name: suggestion.name,
    dosage: suggestion.dosage,
    form: suggestion.form,
    instructions: suggestion.instructions,
    schedule: suggestion.schedule ?? everyHours(8),
    period,
    status: 'active',
    prescriber: suggestion.prescriber ?? '',
    notes: '',
    sourceOcrText: sourceOcrText ?? suggestion.rawText,
  };
}
