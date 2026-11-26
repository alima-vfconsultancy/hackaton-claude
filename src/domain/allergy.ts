import { ACTIVE_INGREDIENTS } from './activeIngredients';
import type { EpochMs } from './time';

/** A substance (active ingredient, drug or drug class) the user is allergic to. */
export interface Allergy {
  id: string;
  substance: string;
  notes: string;
  createdAt: EpochMs;
}

export interface AllergyDraft {
  substance: string;
  notes: string;
}

export type AllergyIssueCode = 'substance_required' | 'substance_duplicated';

/** Lowercase, no accents, single spaces: the form used to compare substances. */
export function normalizeSubstance(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Returns the problems of a draft (empty when it can be saved). */
export function validateAllergyDraft(draft: AllergyDraft, existing: readonly Allergy[]): AllergyIssueCode[] {
  const substance = normalizeSubstance(draft.substance);
  if (!substance) return ['substance_required'];
  if (existing.some((item) => normalizeSubstance(item.substance) === substance)) return ['substance_duplicated'];
  return [];
}

const toWords = (value: string): string => normalizeSubstance(value).replace(/[^a-z0-9]+/g, ' ').trim();

/** The text itself plus the active ingredients of every known brand/class mentioned in it. */
function termsOf(text: string): string[] {
  const words = toWords(text);
  const padded = ` ${words} `;
  const terms = new Set<string>(words ? [words] : []);
  for (const [name, ingredients] of Object.entries(ACTIVE_INGREDIENTS)) {
    if (padded.includes(` ${name} `)) ingredients.forEach((ingredient) => terms.add(ingredient));
  }
  return [...terms];
}

/**
 * Registered allergies that the medication name seems to contain: the substance appears as whole words
 * in the name, or they share an active ingredient (e.g. Novalgina and dipirona).
 * Based on a local, partial table: it only flags known cases and never replaces a professional check.
 */
export function findAllergyMatches(medicationName: string, allergies: readonly Allergy[]): Allergy[] {
  const medicationTerms = termsOf(medicationName);
  const padded = ` ${toWords(medicationName)} `;
  return allergies.filter((item) =>
    termsOf(item.substance).some((term) => padded.includes(` ${term} `) || medicationTerms.includes(term)));
}
