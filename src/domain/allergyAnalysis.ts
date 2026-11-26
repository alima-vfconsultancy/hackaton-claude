export type AllergyRisk = 'none' | 'possible' | 'likely';

export const ALLERGY_RISKS: readonly AllergyRisk[] = ['none', 'possible', 'likely'];

/** What is sent for analysis: only names, never photos, doses or personal data. */
export interface AllergyAnalysisRequest {
  medications: string[];
  allergies: string[];
}

export interface AllergyAnalysisItem {
  medication: string;
  risk: AllergyRisk;
  /** Active ingredients the analysis recognised in the medication. */
  activeIngredients: string[];
  /** One short sentence for the user, in Portuguese. */
  reason: string;
}

function isItem(value: unknown): value is AllergyAnalysisItem {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.medication === 'string'
    && ALLERGY_RISKS.includes(item.risk as AllergyRisk)
    && Array.isArray(item.activeIngredients) && item.activeIngredients.every((ingredient) => typeof ingredient === 'string')
    && typeof item.reason === 'string';
}

/** Validates the `{ results: [...] }` payload exchanged with the analysis service; `null` when malformed. */
export function parseAllergyAnalysis(data: unknown): AllergyAnalysisItem[] | null {
  if (typeof data !== 'object' || data === null) return null;
  const results = (data as { results?: unknown }).results;
  return Array.isArray(results) && results.every(isItem) ? results : null;
}
