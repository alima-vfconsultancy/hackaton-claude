import { describe, expect, it } from 'vitest';
import { cleanupOcrText } from './ocrTextCleanup';
import { parsePrescription } from './prescriptionParser';

describe('cleanupOcrText', () => {
  it.each([
    ['Amoxicilina 5OO mg', 'Amoxicilina 500 mg'],
    ['Dipirona l0 gotas', 'Dipirona 10 gotas'],
    ['Prednisona 2Omg', 'Prednisona 20mg'],
    ['Omeprazol 2O mg em jejum', 'Omeprazol 20 mg em jejum'],
    ['tomar às O8:00 e 2O:00', 'tomar às 08:00 e 20:00'],
    ['Paracetamol 75O mg 1 cp de 6/6 h', 'Paracetamol 750 mg 1 cp de 6/6 h'],
    ['Ibuprofeno 6OO rng', 'Ibuprofeno 600 mg'],
    ['Ibuprofeno 600rnq', 'Ibuprofeno 600mg'],
    ['Losartana 50 mq', 'Losartana 50 mg'],
    ['Xarope 5 rnl', 'Xarope 5 ml'],
    ['Vitamina B12 1000 rncg', 'Vitamina B12 1000 mcg'],
    ['Dipirona 20 gts', 'Dipirona 20 gotas'],
  ])('fixes digits and units misread next to numbers: %s', (input, expected) => {
    expect(cleanupOcrText(input)).toBe(expected);
  });

  it.each([
    ['Tomar 1 cornprimido ao dia', 'Tomar 1 comprimido ao dia'],
    ['1 capsuIa de 8/8 horas', '1 cápsula de 8/8 horas'],
    ['durante 7 dlas', 'durante 7 dias'],
    ['Uso contlnuo', 'Uso contínuo'],
    ['COMPRIMIDOS', 'COMPRIMIDOS'],
    ['Cornprimidos', 'Comprimidos'],
    ['tomar em jejurn', 'tomar em jejum'],
  ])('fixes misread dosing words: %s', (input, expected) => {
    expect(cleanupOcrText(input)).toBe(expected);
  });

  it.each([
    'Losartana 50 mg',
    'Omeprazol 20 mg',
    'Levotiroxina 25 mcg',
    'Vitamina D3 7.000 UI',
    'Clonazepam 2,5 mg/ml',
    'Tomar 1 comprimido às 08:00',
    'Dr. João Silva CRM 12345',
    'Uso contínua',
    'Amoxicilina 250mg/5ml',
    'Insulina 10 UI',
    'Azitromicina 500 mg',
    'Dias 1 a 5',
    '1o comprimido ao acordar',
    'Tomar no 2o dia',
    'Soro 1l',
    '10 m90',
    'Não tornar a usar',
  ])('does not change text that is already right: %s', (input) => {
    expect(cleanupOcrText(input)).toBe(input);
  });

  it('removes lines that are only symbols or a single character', () => {
    expect(cleanupOcrText('Dipirona 500 mg\n|\n~ . ,\na\n  \nTomar 1 cp')).toBe('Dipirona 500 mg\nTomar 1 cp');
  });

  it('keeps a line with a single digit, since it may be the dose', () => {
    expect(cleanupOcrText('Dipirona\n2\ncomprimidos')).toBe('Dipirona\n2\ncomprimidos');
  });

  it('is used by the prescription parser, so misread doses still become suggestions', () => {
    const [suggestion] = parsePrescription('Amoxicilina 5OO rng\nTomar 1 cápsula de 8/8 horas por 7 dlas');
    expect(suggestion.name).toBe('Amoxicilina');
    expect(suggestion.dosage).toEqual({ amount: 500, unit: 'mg' });
    expect(suggestion.duration).toEqual({ type: 'days', days: 7 });
  });
});
