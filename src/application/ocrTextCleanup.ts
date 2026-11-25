/**
 * Fixes the most common OCR mistakes in prescription text before it is parsed.
 * Pure module. It only touches numbers, units and a short list of dosing words —
 * never medication names — and every result still goes through the review screen.
 */

/** Letters the OCR confuses with digits inside numbers ("5OO" -> "500", "l0" -> "10"). */
const DIGIT_LOOKALIKES: Record<string, string> = { O: '0', o: '0', l: '1', I: '1' };

/** Suffixes that may follow a number directly ("20mg", "8h", "2x"), including misread units. */
const NUMBER_SUFFIXES = new Set(['', 'mg', 'mcg', 'ml', 'g', 'ui', 'h', 'hs', 'x', 'cp', 'comp', 'gts', 'gt', 'rng', 'rnq', 'mq', 'rnl', 'rncg', 'mcq']);

/** Misread units, only fixed right after a number. */
const UNIT_FIXES: Array<[RegExp, string]> = [
  [/(\d)(\s?)(?:rncg|mcq)(?![\p{L}\d])/gu, '$1$2mcg'],
  [/(\d)(\s?)(?:rng|rnq|mq|m9)(?![\p{L}\d])/gu, '$1$2mg'],
  [/(\d)(\s?)(?:rnl|mI)(?![\p{L}\d])/gu, '$1$2ml'],
  [/(\d)(\s?)(?:gts|gt)(?![\p{L}\d])/gu, '$1$2gotas'],
];

/** Dosing words checked against OCR lookalikes (canonical spelling, with accents). */
const DOSING_WORDS = [
  'comprimido', 'comprimidos', 'cápsula', 'cápsulas', 'gota', 'gotas', 'dia', 'dias', 'hora', 'horas',
  'tomar', 'durante', 'contínuo', 'contínua', 'jejum', 'xarope', 'ampola', 'ampolas', 'semana', 'semanas',
  'aplicar', 'refeição', 'refeições', 'almoço', 'jantar', 'noite', 'manhã', 'mililitros', 'colher',
];

const stripAccents = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Spelling key that ignores the usual OCR confusions: "rn"/"m", "i"/"l"/"1", "vv"/"w". */
const lookalikeKey = (word: string) =>
  stripAccents(word.toLowerCase()).replace(/rn/g, 'm').replace(/vv/g, 'w').replace(/[il1|]/g, 'i');

/** Real words whose lookalike key collides with a dosing word ("tornar" -> "tomar"): never corrected. */
const LOOKALIKE_REAL_WORDS = ['tornar'];

const EXACT_WORDS = new Set([...DOSING_WORDS, ...LOOKALIKE_REAL_WORDS].map((word) => stripAccents(word)));
const WORDS_BY_KEY = new Map(DOSING_WORDS.map((word) => [lookalikeKey(word), word]));

function fixNumber(token: string): string {
  const match = /^([\dOoIl]*\d[\dOoIl]*)(\p{L}*)$/u.exec(token);
  if (!match || !NUMBER_SUFFIXES.has(match[2].toLowerCase())) return token;
  // A lowercase "o"/"l" ending the number is usually an ordinal or a unit ("1o", "2o dia", "1l"), not a digit.
  if (/[ol]$/.test(match[1])) return token;
  return match[1].replace(/[OoIl]/g, (letter) => DIGIT_LOOKALIKES[letter]) + match[2];
}

function matchCase(original: string, canonical: string): string {
  if (original.length > 1 && original === original.toUpperCase()) return canonical.toUpperCase();
  if (original[0] === original[0].toUpperCase()) return canonical[0].toUpperCase() + canonical.slice(1);
  return canonical;
}

function fixDosingWord(word: string): string {
  if (EXACT_WORDS.has(stripAccents(word.toLowerCase()))) return word;
  const canonical = WORDS_BY_KEY.get(lookalikeKey(word));
  return canonical ? matchCase(word, canonical) : word;
}

/** A line with no digit and fewer than two letters is a speck read as text (a lone digit may be the dose). */
const isJunkLine = (line: string) => !/\d/.test(line) && (line.match(/\p{L}/gu)?.length ?? 0) < 2;

/**
 * Cleans the raw OCR text of a prescription: digits misread as letters inside numbers,
 * misread units after numbers ("rng" -> "mg"), dosing words with lookalike letters
 * ("cornprimido" -> "comprimido") and lines made only of specks. Correct text is kept as is.
 *
 * @param text - raw text recognized from the photo
 * @returns the cleaned text, line by line
 */
export function cleanupOcrText(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((line) => !isJunkLine(line))
    .map((line) => {
      let fixed = line.replace(/[\p{L}\d]+/gu, (token) => fixNumber(token));
      for (const [pattern, replacement] of UNIT_FIXES) fixed = fixed.replace(pattern, replacement);
      return fixed.replace(/[\p{L}1|]+/gu, (word) => (/\p{L}/u.test(word) ? fixDosingWord(word) : word));
    })
    .join('\n');
}
