import { TriangleAlert } from 'lucide-react';
import { findAllergyMatches, type Allergy } from '../../domain/allergy';

/** Warns when the medication name contains a registered allergy. It never blocks saving. */
export function AllergyWarning({ medicationName, allergies }: { medicationName: string; allergies: readonly Allergy[] }) {
  const matches = findAllergyMatches(medicationName, allergies);
  if (matches.length === 0) return null;
  return (
    <div role="alert" className="mb-3 flex gap-2 rounded-xl border-2 border-red-600 bg-red-50 p-3 text-red-950">
      <TriangleAlert className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
      <p className="font-semibold">
        Atenção: você cadastrou alergia a {matches.map((match) => match.substance).join(', ')}. Este remédio parece conter essa substância. Fale com seu médico ou farmacêutico antes de tomar.
      </p>
    </div>
  );
}
