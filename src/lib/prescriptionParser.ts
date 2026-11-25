/**
 * Interpreta o texto bruto do OCR de uma receita e SUGERE medicamentos.
 * Módulo puro (sem React/DOM). O resultado NUNCA é salvo diretamente:
 * sempre passa pela tela de revisão (ver CLAUDE.md, regras de segurança).
 */
import type { MedForm, MedicationInput, ScheduleType } from '../types';

export type Confidence = 'alta' | 'baixa';

export interface Suggestion {
  name: string;
  dosage: string;
  unit: string;
  form: MedForm;
  instructions: string;
  scheduleType: ScheduleType;
  intervalHours?: number;
  times: string[];
  firstDoseTime: string;
  durationDays?: number;
  continuous: boolean;
  prescriber?: string;
  confidence: { name: Confidence; dosage: Confidence; schedule: Confidence; duration: Confidence };
  /** Trecho do texto de onde a sugestão saiu (auditoria / conferência). */
  rawText: string;
}

const strip = (s: string) => s.normalize('NFC').normalize('NFD').replace(/[̀-ͯ]/g, '');

const NUMBER_WORDS: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, seis: 6, meio: 0.5, meia: 0.5 };

const DEFAULT_TIMES: Record<number, string[]> = {
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

function qtyUnit(raw: string): string {
  if (raw.startsWith('gota')) return 'gotas';
  if (/^(comprimido|comp|cp)/.test(raw)) return 'comprimido(s)';
  if (/^(capsula|caps)/.test(raw)) return 'cápsula(s)';
  if (raw.startsWith('ampola')) return 'ampola(s)';
  if (raw.startsWith('colher')) return 'colher(es)';
  if (raw.startsWith('aplicac')) return 'aplicação';
  if (raw.startsWith('sache')) return 'sachê(s)';
  return raw;
}

function plural(unit: string, n: string): string {
  const v = parseFloat(n.replace(',', '.'));
  return unit.replace(/\((e?s)\)/, v === 1 ? '' : '$1');
}

function qtyNumber(raw: string): string {
  const n = NUMBER_WORDS[raw];
  return n !== undefined ? String(n).replace('.', ',') : raw;
}

function detectForm(norm: string): MedForm {
  if (/\b(comprimidos?|comp|cp)\b/.test(norm)) return 'comprimido';
  if (/\b(capsulas?|caps)\b/.test(norm)) return 'cápsula';
  if (/\b(gotas?)\b/.test(norm)) return 'gotas';
  if (/\b(pomada|creme|gel)\b/.test(norm)) return 'pomada';
  if (/\b(injetavel|injecao|ampola|intramuscular|im)\b/.test(norm)) return 'injeção';
  if (/\b(xarope|solucao|suspensao|liquido|ml)\b/.test(norm)) return 'líquido';
  return 'outro';
}

const INSTRUCTIONS: Array<[RegExp, string]> = [
  [/\b(apos|depois d[aeo]s?) (as )?refeic/, 'após as refeições'],
  [/\bantes d[aeo]s? refeic/, 'antes das refeições'],
  [/\bcom (as )?refeic|junto com (os )?alimentos|com alimento/, 'junto com alimentos'],
  [/\bem jejum\b/, 'em jejum'],
  [/\b(ao deitar|antes de dormir)\b/, 'ao deitar'],
  [/\bcom (um copo de )?agua\b/, 'com água'],
  [/\buso (topico|externo)\b/, 'uso tópico'],
];

interface Freq {
  scheduleType: ScheduleType;
  intervalHours?: number;
  times: string[];
  confidence: Confidence;
  found: boolean;
}

function parseFrequency(norm: string): Freq {
  // "de 8 em 8 horas", "8/8h", "8 / 8 horas"
  const rep = norm.match(/(\d{1,2})\s*(?:em|\/)\s*(\d{1,2})\s*h(?:oras?|rs?)?\b/);
  if (rep && rep[1] === rep[2] && +rep[1] > 0 && +rep[1] <= 48) {
    return { scheduleType: 'interval', intervalHours: +rep[1], times: [], confidence: 'alta', found: true };
  }
  // "a cada 12 horas"
  const each = norm.match(/cada\s+(\d{1,2})\s*h(?:oras?|rs?)?\b/);
  if (each && +each[1] > 0 && +each[1] <= 48) {
    return { scheduleType: 'interval', intervalHours: +each[1], times: [], confidence: 'alta', found: true };
  }
  // "3x ao dia", "3 x/dia", "3 vezes por dia", "uma vez ao dia"
  const times = norm.match(/(\d|um|uma|duas|dois|tres|quatro|cinco|seis)\s*(?:x|vez(?:es)?)\s*(?:ao|por|\/|no|a)?\s*dia/);
  if (times) {
    const words: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6 };
    const n = words[times[1]] ?? +times[1];
    if (DEFAULT_TIMES[n]) return { scheduleType: 'fixedTimes', times: DEFAULT_TIMES[n], confidence: 'baixa', found: true };
  }
  if (/\b(diariamente|todo dia|todos os dias)\b/.test(norm)) {
    return { scheduleType: 'fixedTimes', times: DEFAULT_TIMES[1], confidence: 'baixa', found: true };
  }
  if (/\b(a noite|ao deitar|antes de dormir|a hora de dormir)\b/.test(norm)) {
    return { scheduleType: 'fixedTimes', times: ['22:00'], confidence: 'baixa', found: true };
  }
  if (/\b(pela manha|de manha|ao acordar)\b/.test(norm)) {
    return { scheduleType: 'fixedTimes', times: ['08:00'], confidence: 'baixa', found: true };
  }
  if (/\bem jejum\b/.test(norm)) {
    return { scheduleType: 'fixedTimes', times: ['07:00'], confidence: 'baixa', found: true };
  }
  return { scheduleType: 'interval', intervalHours: undefined, times: [], confidence: 'baixa', found: false };
}

function parseDuration(norm: string): { days?: number; continuous: boolean; confidence: Confidence } {
  if (/\b(uso continuo|continuo|continuamente|uso prolongado)\b/.test(norm)) return { continuous: true, confidence: 'alta' };
  const d = norm.match(/\b(?:por|durante|ate)\s+(\d{1,3})\s*dias?\b/) ?? norm.match(/\b(\d{1,3})\s*dias\b/);
  if (d && +d[1] > 0) return { days: +d[1], continuous: false, confidence: 'alta' };
  const w = norm.match(/\b(?:por|durante)\s+(\d{1,2})\s*semanas?\b/);
  if (w) return { days: +w[1] * 7, continuous: false, confidence: 'alta' };
  const m = norm.match(/\b(?:por|durante)\s+(\d{1,2}|um|uma)\s*mes(?:es)?\b/);
  if (m) return { days: (NUMBER_WORDS[m[1]] ?? +m[1]) * 30, continuous: false, confidence: 'baixa' };
  return { continuous: false, confidence: 'baixa' };
}

function titleCase(s: string): string {
  const letters = s.replace(/[^A-Za-zÀ-ÿ]/g, '');
  const allCaps = letters.length > 0 && letters === letters.toUpperCase();
  const base = allCaps ? s.toLowerCase() : s;
  return base.replace(/(^|\s)(\p{L})/gu, (_, sp, c) => sp + c.toUpperCase());
}

function extractName(line: string): string {
  let rest = line.replace(NUMBERING, '').trim();
  for (let i = 0; i < 2; i++) {
    const m = strip(rest.toLowerCase()).match(FORM_PREFIX);
    if (m) rest = rest.slice(m[0].length);
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

function buildSuggestion(block: string[], prescriber?: string): Suggestion {
  const first = block[0];
  const text = block.join(' ');
  const norm = strip(text.toLowerCase());
  const firstNorm = strip(first.toLowerCase());

  const name = extractName(first);

  // Dosagem: prefere a concentração (500 mg); sem ela, a quantidade por tomada (20 gotas).
  let dosage = '';
  let unit = '';
  let dosageConf: Confidence = 'baixa';
  let rest = norm;
  const st = firstNorm.match(STRENGTH) ?? norm.match(STRENGTH);
  if (st) {
    dosage = st[1];
    unit = st[2] === 'ug' ? 'mcg' : st[2];
    if (st[4]) unit += `/${st[3] ?? ''}ml`;
    dosageConf = 'alta';
    rest = norm.replace(st[0], ' ');
  }
  const q = rest.match(QUANTITY);
  const extraInstr: string[] = [];
  if (q) {
    const qn = qtyNumber(q[1]);
    const qu = qtyUnit(q[2]);
    if (!st) {
      dosage = qn;
      unit = qu;
      dosageConf = 'baixa';
    } else {
      extraInstr.push(`${qn} ${plural(qu, qn)} por vez`);
    }
  }

  const freq = parseFrequency(norm);
  const dur = parseDuration(norm);

  const instr = [...extraInstr];
  for (const [re, label] of INSTRUCTIONS) if (re.test(norm) && !instr.includes(label)) instr.push(label);

  return {
    name,
    dosage,
    unit: unit || 'mg',
    form: detectForm(norm),
    instructions: instr.join(', '),
    scheduleType: freq.scheduleType,
    intervalHours: freq.intervalHours,
    times: freq.times,
    firstDoseTime: freq.times[0] ?? '08:00',
    durationDays: dur.days,
    continuous: dur.continuous,
    prescriber,
    confidence: {
      name: name.length >= 4 && st ? 'alta' : 'baixa',
      dosage: dosageConf,
      schedule: freq.confidence,
      duration: dur.confidence,
    },
    rawText: text,
  };
}

export function parsePrescription(rawText: string): Suggestion[] {
  const text = rawText.normalize('NFC');
  const presc = text.match(/\b(?:dr|dra)\.?\s+([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+){0,2})/i);
  const prescWords = presc ? presc[1].split(/\s+/) : [];
  const stop = prescWords.findIndex((w) => /^(crm|cpf|rg|cro)$/i.test(w));
  const prescName = (stop >= 0 ? prescWords.slice(0, stop) : prescWords).join(' ');
  const prescriber = presc && prescName ? `${/dra/i.test(presc[0].slice(0, 3)) ? 'Dra.' : 'Dr.'} ${titleCase(prescName)}` : undefined;

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
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
    .map((b) => buildSuggestion(b, prescriber))
    .filter((s) => s.name && (s.dosage || s.intervalHours || s.times.length)); // descarta blocos sem sinal útil
}

/** Converte uma sugestão em dados de formulário (ainda NÃO salvos). */
export function suggestionToInput(s: Suggestion, startDate: string, ocrRawText?: string): MedicationInput {
  return {
    name: s.name,
    dosage: s.dosage,
    unit: s.unit,
    form: s.form,
    instructions: s.instructions,
    scheduleType: s.scheduleType,
    intervalHours: s.scheduleType === 'interval' ? s.intervalHours ?? 8 : undefined,
    firstDoseTime: s.firstDoseTime,
    times: s.scheduleType === 'fixedTimes' ? s.times : ['08:00', '20:00'],
    startDate,
    endDate: undefined,
    durationDays: s.continuous ? undefined : s.durationDays ?? 7,
    continuous: s.continuous,
    status: 'active',
    prescriber: s.prescriber ?? '',
    notes: '',
    ocrRawText: ocrRawText ?? s.rawText,
  };
}
