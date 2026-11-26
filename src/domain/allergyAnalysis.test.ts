import { describe, expect, it } from 'vitest';
import { parseAllergyAnalysis } from './allergyAnalysis';

const valid = { medication: 'Novalgina', risk: 'likely', activeIngredients: ['dipirona'], reason: 'Contém dipirona.' };

describe('parseAllergyAnalysis', () => {
  it('accepts a well-formed response', () => {
    expect(parseAllergyAnalysis({ results: [valid] })).toEqual([valid]);
  });

  it('rejects anything that is not the agreed shape', () => {
    expect(parseAllergyAnalysis(null)).toBeNull();
    expect(parseAllergyAnalysis({})).toBeNull();
    expect(parseAllergyAnalysis({ results: [{ ...valid, risk: 'high' }] })).toBeNull();
    expect(parseAllergyAnalysis({ results: [{ ...valid, activeIngredients: 'dipirona' }] })).toBeNull();
    expect(parseAllergyAnalysis({ results: [{ ...valid, reason: 3 }] })).toBeNull();
  });
});
