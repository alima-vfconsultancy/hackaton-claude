import { describe, expect, it } from 'vitest';
import { findAllergyMatches, normalizeSubstance, validateAllergyDraft, type Allergy } from './allergy';

const allergy = (substance: string, id = substance): Allergy => ({ id, substance, notes: '', createdAt: 0 });

describe('normalizeSubstance', () => {
  it('ignores case, accents and extra spaces', () => {
    expect(normalizeSubstance('  Dipirôna   SÓDICA ')).toBe('dipirona sodica');
  });
});

describe('validateAllergyDraft', () => {
  it('requires a substance', () => {
    expect(validateAllergyDraft({ substance: '   ', notes: '' }, [])).toEqual(['substance_required']);
  });

  it('refuses a substance that is already registered, ignoring accents and case', () => {
    expect(validateAllergyDraft({ substance: 'DIPIRONA', notes: '' }, [allergy('Dipirona')])).toEqual(['substance_duplicated']);
  });

  it('accepts a new substance', () => {
    expect(validateAllergyDraft({ substance: 'Penicilina', notes: '' }, [allergy('Dipirona')])).toEqual([]);
  });
});

describe('findAllergyMatches', () => {
  it('finds a registered substance inside the medication name', () => {
    const matches = findAllergyMatches('Dipirona sódica 500 mg', [allergy('Dipirona'), allergy('Penicilina')]);
    expect(matches.map((m) => m.substance)).toEqual(['Dipirona']);
  });

  it('matches whole words only', () => {
    expect(findAllergyMatches('Amoxicilina', [allergy('Cilina')])).toEqual([]);
  });

  it('flags a brand name whose active ingredient is a registered allergy', () => {
    expect(findAllergyMatches('Novalgina 500 mg', [allergy('Dipirona')]).map((m) => m.substance)).toEqual(['Dipirona']);
    expect(findAllergyMatches('Dorflex', [allergy('dipirona')])).toHaveLength(1);
  });

  it('flags the active ingredient when the allergy was registered by brand name', () => {
    expect(findAllergyMatches('Dipirona sódica', [allergy('Novalgina')])).toHaveLength(1);
    expect(findAllergyMatches('Anador', [allergy('Novalgina')])).toHaveLength(1);
  });

  it('flags members of a drug class', () => {
    expect(findAllergyMatches('Amoxicilina 500 mg', [allergy('Penicilina')])).toHaveLength(1);
    expect(findAllergyMatches('Clavulin', [allergy('Penicilina')])).toHaveLength(1);
  });

  it('does not flag unrelated brands', () => {
    expect(findAllergyMatches('Tylenol', [allergy('Dipirona')])).toEqual([]);
  });

  it('returns nothing when there is no match or no allergy', () => {
    expect(findAllergyMatches('Losartana', [allergy('Dipirona')])).toEqual([]);
    expect(findAllergyMatches('Losartana', [])).toEqual([]);
  });
});
