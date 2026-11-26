import { findAllergyMatches, normalizeSubstance, validateAllergyDraft, type Allergy, type AllergyDraft, type AllergyIssueCode } from '../domain/allergy';
import type { AllergyAnalysisItem } from '../domain/allergyAnalysis';
import { DEFAULT_SETTINGS } from '../domain/settings';
import type { AllergyAnalyzer, StoragePorts } from './ports';

export type AddAllergyResult = { ok: true } | { ok: false; issues: AllergyIssueCode[] };

export type AiAnalysisResult =
  | { status: 'ok'; items: AllergyAnalysisItem[] }
  /** No analysis service is configured in this build. */
  | { status: 'unavailable' }
  /** The user has not yet agreed to send names to the service; nothing was sent. */
  | { status: 'consent_required' }
  | { status: 'no_allergies' }
  /** Network or service error; the local check keeps working. */
  | { status: 'failed' };

export interface AllergyService {
  /** Alphabetical by substance. */
  list(): Promise<Allergy[]>;
  add(draft: AllergyDraft): Promise<AddAllergyResult>;
  remove(id: string): Promise<void>;
  /** Registered allergies whose substance appears in the medication name (local text comparison). */
  check(medicationName: string): Promise<Allergy[]>;
  isAiAvailable(): boolean;
  /**
   * Asks the analysis service about the given medication names. Runs only after the user's consent
   * and sends nothing but the names and the registered allergy substances.
   */
  analyzeWithAi(medicationNames: string[]): Promise<AiAnalysisResult>;
}

/** Builds the allergy use cases on top of the allergy repository and the optional analysis service. */
export function createAllergyService(
  { allergies, ids, settings }: Pick<StoragePorts, 'allergies' | 'ids' | 'settings'>,
  analyzer: AllergyAnalyzer | null = null,
): AllergyService {
  const list = async () =>
    (await allergies.listAll()).sort((a, b) => normalizeSubstance(a.substance).localeCompare(normalizeSubstance(b.substance)));

  return {
    list,
    async add(draft) {
      const clean: AllergyDraft = { substance: draft.substance.trim(), notes: draft.notes.trim() };
      const issues = validateAllergyDraft(clean, await allergies.listAll());
      if (issues.length) return { ok: false, issues };
      await allergies.add({ id: ids.next(), ...clean, createdAt: Date.now() });
      return { ok: true };
    },
    remove: (id) => allergies.remove(id),
    async check(medicationName) {
      return findAllergyMatches(medicationName, await allergies.listAll());
    },
    isAiAvailable: () => analyzer !== null,
    async analyzeWithAi(medicationNames) {
      if (!analyzer) return { status: 'unavailable' };
      const stored = (await settings.get()) ?? DEFAULT_SETTINGS;
      if (!stored.allergyAiConsent) return { status: 'consent_required' };
      const substances = (await allergies.listAll()).map((allergy) => allergy.substance);
      if (substances.length === 0) return { status: 'no_allergies' };
      const names = medicationNames.map((name) => name.trim()).filter(Boolean);
      if (names.length === 0) return { status: 'ok', items: [] };
      try {
        return { status: 'ok', items: await analyzer.analyze({ medications: names, allergies: substances }) };
      } catch {
        return { status: 'failed' };
      }
    },
  };
}
