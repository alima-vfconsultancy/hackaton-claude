/**
 * Common Brazilian brand names and drug classes, mapped to active ingredients (no accents, lowercase).
 * Local and offline on purpose. It is NOT exhaustive: a medication missing here is simply not recognised.
 */
export const ACTIVE_INGREDIENTS: Readonly<Record<string, readonly string[]>> = {
  novalgina: ['dipirona'],
  anador: ['dipirona'],
  metamizol: ['dipirona'],
  dorflex: ['dipirona', 'orfenadrina', 'cafeina'],
  neosaldina: ['dipirona', 'isometepteno', 'cafeina'],
  'buscopan composto': ['dipirona', 'escopolamina'],
  tylenol: ['paracetamol'],
  'ben u ron': ['paracetamol'],
  aspirina: ['acido acetilsalicilico'],
  aas: ['acido acetilsalicilico'],
  advil: ['ibuprofeno'],
  alivium: ['ibuprofeno'],
  voltaren: ['diclofenaco'],
  cataflam: ['diclofenaco'],
  nisulid: ['nimesulida'],
  amoxil: ['amoxicilina'],
  clavulin: ['amoxicilina', 'clavulanato'],
  benzetacil: ['penicilina', 'benzilpenicilina'],
  keflex: ['cefalexina'],
  zitromax: ['azitromicina'],
  bactrim: ['sulfametoxazol', 'trimetoprima'],
  // Drug classes: an allergy to the class covers its members.
  penicilina: ['penicilina', 'amoxicilina', 'ampicilina', 'benzilpenicilina'],
  sulfa: ['sulfametoxazol', 'sulfadiazina'],
  sulfonamida: ['sulfametoxazol', 'sulfadiazina'],
};
