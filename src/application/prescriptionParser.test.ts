import { describe, expect, it } from 'vitest';
import { parsePrescription, suggestionToDraft } from './prescriptionParser';

const first = (text: string) => {
  const result = parsePrescription(text);
  expect(result.length).toBeGreaterThanOrEqual(1);
  return result[0];
};

describe('parsePrescription: single prescription lines', () => {
  it('1. reads "Amoxicilina 500mg de 8 em 8 horas por 7 dias"', () => {
    const s = first('Amoxicilina 500mg de 8 em 8 horas por 7 dias');
    expect(s.name).toBe('Amoxicilina');
    expect(s.dosage).toEqual({ amount: 500, unit: 'mg' });
    expect(s.schedule).toEqual({ type: 'interval', intervalHours: 8, firstDoseTime: '08:00' });
    expect(s.duration).toEqual({ type: 'days', days: 7 });
    expect(s.confidence).toEqual({ name: 'high', dosage: 'high', schedule: 'high', duration: 'high' });
  });

  it('2. accepts a space between amount and unit: "Dipirona 500 mg 6/6h"', () => {
    const s = first('Dipirona 500 mg 6/6h');
    expect(s.dosage).toEqual({ amount: 500, unit: 'mg' });
    expect(s.schedule).toMatchObject({ type: 'interval', intervalHours: 6 });
  });

  it('3. accepts "8/8h" without spaces', () => {
    expect(first('Cefalexina 500mg 8/8h por 10 dias').schedule).toMatchObject({ intervalHours: 8 });
  });

  it('4. accepts "a cada 12 horas"', () => {
    const s = first('Azitromicina 500mg a cada 12 horas durante 5 dias');
    expect(s.schedule).toMatchObject({ intervalHours: 12 });
    expect(s.duration).toEqual({ type: 'days', days: 5 });
  });

  it('5. turns "3x ao dia" into fixed times with low confidence', () => {
    const s = first('Ibuprofeno 600 mg 3x ao dia');
    expect(s.schedule).toEqual({ type: 'fixedTimes', times: ['08:00', '14:00', '20:00'] });
    expect(s.confidence.schedule).toBe('low');
  });

  it('6. understands "uma vez ao dia" and continuous use', () => {
    const s = first('Losartana 50mg uma vez ao dia uso contínuo');
    expect(s.schedule).toEqual({ type: 'fixedTimes', times: ['08:00'] });
    expect(s.duration).toEqual({ type: 'continuous' });
    expect(s.confidence.duration).toBe('high');
  });

  it('7. understands "2 vezes por dia"', () => {
    expect(first('Metformina 850mg 2 vezes por dia').schedule).toEqual({ type: 'fixedTimes', times: ['08:00', '20:00'] });
  });

  it('8. understands "à noite"', () => {
    const s = first('Sinvastatina 20mg 1 comprimido à noite');
    expect(s.schedule).toEqual({ type: 'fixedTimes', times: ['22:00'] });
    expect(s.dosage).toEqual({ amount: 20, unit: 'mg' });
  });

  it('9. turns "em jejum" into a time and an instruction', () => {
    const s = first('Levotiroxina 50mcg 1 comprimido pela manhã em jejum uso contínuo');
    expect(s.dosage?.unit).toBe('mcg');
    expect(s.instructions).toContain('em jejum');
    expect(s.duration).toEqual({ type: 'continuous' });
  });

  it('10. uses the amount per intake when there is no strength: "20 gotas"', () => {
    const s = first('Dipirona gotas 20 gotas de 6 em 6 horas');
    expect(s.dosage).toEqual({ amount: 20, unit: 'drops' });
    expect(s.form).toBe('drops');
    expect(s.confidence.dosage).toBe('low');
  });

  it('11. reads "5 ml" of a syrup', () => {
    const s = first('Xarope Ambroxol 5 ml 8/8h por 7 dias');
    expect(s.dosage).toEqual({ amount: 5, unit: 'ml' });
    expect(s.form).toBe('liquid');
  });

  it('12. handles numbering and the quantity per intake', () => {
    const s = first('1) Paracetamol 750mg - 1 comprimido de 6/6h');
    expect(s.name).toBe('Paracetamol');
    expect(s.dosage).toEqual({ amount: 750, unit: 'mg' });
    expect(s.instructions).toContain('1 comprimido por vez');
    expect(s.schedule).toMatchObject({ intervalHours: 6 });
  });

  it('13. normalizes names written in capital letters', () => {
    expect(first('AMOXICILINA 500MG 8/8H').name).toBe('Amoxicilina');
  });

  it('14. converts weeks into days', () => {
    expect(first('Prednisona 20mg 1x ao dia por 2 semanas').duration).toEqual({ type: 'days', days: 14 });
  });

  it('15. keeps "após as refeições" as an instruction', () => {
    expect(first('Omeprazol 20mg 12/12h após as refeições').instructions).toContain('após as refeições');
  });

  it('16. has no schedule and low confidence when the frequency is missing', () => {
    const s = first('Vitamina D 2000 UI');
    expect(s.dosage).toEqual({ amount: 2000, unit: 'iu' });
    expect(s.schedule).toBeNull();
    expect(s.confidence.schedule).toBe('low');
    expect(s.duration).toBeNull();
    expect(s.confidence.duration).toBe('low');
  });

  it('17. reads a concentration such as 250mg/5ml', () => {
    const s = first('Amoxicilina 250mg/5ml suspensão tomar 5 ml de 8 em 8 horas');
    expect(s.dosage).toEqual({ amount: 250, unit: 'mg', perMl: 5 });
    expect(s.instructions).toContain('5 ml por vez');
  });

  it('19. reads a thousands separator as part of the number', () => {
    expect(first('Dipirona 1.000mg 6/6h').dosage).toEqual({ amount: 1000, unit: 'mg' });
  });

  it('18. does not read different numbers in "X/Y h" as an interval', () => {
    expect(first('Remédio Teste 10mg 3/8h').confidence.schedule).toBe('low');
  });
});

describe('parsePrescription: complete prescription', () => {
  const prescription = `
    CLÍNICA SAÚDE E VIDA
    Dr. Carlos Almeida  CRM 12345-SP
    Paciente: Maria da Silva
    Data: 10/03/2026

    Uso oral

    1) Amoxicilina 500mg
       Tomar 1 cápsula de 8 em 8 horas por 7 dias
    2) Dipirona 500mg
       Tomar 1 comprimido de 6/6h se dor ou febre
    3) Losartana 50mg
       1 comprimido pela manhã - uso contínuo

    Assinatura
  `;

  it('separates several medications and ignores the header', () => {
    const result = parsePrescription(prescription);
    expect(result.map((s) => s.name)).toEqual(['Amoxicilina', 'Dipirona', 'Losartana']);
    expect(result[0].schedule).toMatchObject({ intervalHours: 8 });
    expect(result[0].duration).toEqual({ type: 'days', days: 7 });
    expect(result[1].schedule).toMatchObject({ intervalHours: 6 });
    expect(result[2].duration).toEqual({ type: 'continuous' });
    expect(result[0].prescriber).toBe('Dr. Carlos Almeida');
  });

  it('returns an empty list for text without medications', () => {
    expect(parsePrescription('Paciente: João\nData: 10/03/2026\nCRM 123')).toEqual([]);
    expect(parsePrescription('')).toEqual([]);
  });
});

describe('suggestionToDraft', () => {
  it('builds an active draft with an inclusive end date, without saving anything', () => {
    const suggestion = parsePrescription('Amoxicilina 500mg 8/8h por 7 dias')[0];
    const draft = suggestionToDraft(suggestion, '2026-03-10', 'raw text');
    expect(draft.status).toBe('active');
    expect(draft.period).toEqual({ startDate: '2026-03-10', endDate: '2026-03-16' });
    expect(draft.sourceOcrText).toBe('raw text');
    expect(draft.schedule).toEqual({ type: 'interval', intervalHours: 8, firstDoseTime: '08:00' });
  });

  it('has no end date for continuous use', () => {
    const draft = suggestionToDraft(first('Losartana 50mg uma vez ao dia uso contínuo'), '2026-03-10');
    expect(draft.period).toEqual({ startDate: '2026-03-10' });
  });

  it('falls back to every 8 hours for 7 days when the prescription is silent', () => {
    const draft = suggestionToDraft(first('Vitamina D 2000 UI'), '2026-03-10');
    expect(draft.schedule).toEqual({ type: 'interval', intervalHours: 8, firstDoseTime: '08:00' });
    expect(draft.period.endDate).toBe('2026-03-16');
  });
});
