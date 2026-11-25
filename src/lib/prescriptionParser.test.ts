import { describe, expect, it } from 'vitest';
import { parsePrescription, suggestionToInput } from './prescriptionParser';

const one = (text: string) => {
  const r = parsePrescription(text);
  expect(r.length).toBeGreaterThanOrEqual(1);
  return r[0];
};

describe('prescriptionParser - linhas de receita', () => {
  it('1. "Amoxicilina 500mg de 8 em 8 horas por 7 dias"', () => {
    const s = one('Amoxicilina 500mg de 8 em 8 horas por 7 dias');
    expect(s.name).toBe('Amoxicilina');
    expect(s.dosage).toBe('500');
    expect(s.unit).toBe('mg');
    expect(s.scheduleType).toBe('interval');
    expect(s.intervalHours).toBe(8);
    expect(s.durationDays).toBe(7);
    expect(s.confidence).toEqual({ name: 'alta', dosage: 'alta', schedule: 'alta', duration: 'alta' });
  });

  it('2. dosagem com espaço: "Dipirona 500 mg 6/6h"', () => {
    const s = one('Dipirona 500 mg 6/6h');
    expect(s.dosage).toBe('500');
    expect(s.intervalHours).toBe(6);
  });

  it('3. "8/8h" colado', () => {
    expect(one('Cefalexina 500mg 8/8h por 10 dias').intervalHours).toBe(8);
  });

  it('4. "a cada 12 horas"', () => {
    const s = one('Azitromicina 500mg a cada 12 horas durante 5 dias');
    expect(s.intervalHours).toBe(12);
    expect(s.durationDays).toBe(5);
  });

  it('5. "3x ao dia" vira horários fixos com baixa confiança', () => {
    const s = one('Ibuprofeno 600 mg 3x ao dia');
    expect(s.scheduleType).toBe('fixedTimes');
    expect(s.times).toEqual(['08:00', '14:00', '20:00']);
    expect(s.confidence.schedule).toBe('baixa');
  });

  it('6. "uma vez ao dia"', () => {
    const s = one('Losartana 50mg uma vez ao dia uso contínuo');
    expect(s.times).toEqual(['08:00']);
    expect(s.continuous).toBe(true);
    expect(s.confidence.duration).toBe('alta');
  });

  it('7. "2 vezes por dia"', () => {
    expect(one('Metformina 850mg 2 vezes por dia').times).toEqual(['08:00', '20:00']);
  });

  it('8. "à noite"', () => {
    const s = one('Sinvastatina 20mg 1 comprimido à noite');
    expect(s.times).toEqual(['22:00']);
    expect(s.dosage).toBe('20');
  });

  it('9. "em jejum" gera horário e instrução', () => {
    const s = one('Levotiroxina 50mcg 1 comprimido pela manhã em jejum uso contínuo');
    expect(s.unit).toBe('mcg');
    expect(s.instructions).toContain('em jejum');
    expect(s.continuous).toBe(true);
  });

  it('10. gotas sem concentração: "Gotas 20 gotas de 6/6h"', () => {
    const s = one('Dipirona gotas 20 gotas de 6 em 6 horas');
    expect(s.dosage).toBe('20');
    expect(s.unit).toBe('gotas');
    expect(s.form).toBe('gotas');
    expect(s.confidence.dosage).toBe('baixa');
  });

  it('11. "5 ml" de xarope', () => {
    const s = one('Xarope Ambroxol 5 ml 8/8h por 7 dias');
    expect(s.dosage).toBe('5');
    expect(s.unit).toBe('ml');
    expect(s.form).toBe('líquido');
  });

  it('12. numeração e quantidade por vez: "1) Paracetamol 750mg - 1 comprimido de 6/6h"', () => {
    const s = one('1) Paracetamol 750mg - 1 comprimido de 6/6h');
    expect(s.name).toBe('Paracetamol');
    expect(s.dosage).toBe('750');
    expect(s.instructions).toContain('1 comprimido por vez');
    expect(s.intervalHours).toBe(6);
  });

  it('13. nome em MAIÚSCULAS é normalizado', () => {
    expect(one('AMOXICILINA 500MG 8/8H').name).toBe('Amoxicilina');
  });

  it('14. duração em semanas', () => {
    expect(one('Prednisona 20mg 1x ao dia por 2 semanas').durationDays).toBe(14);
  });

  it('15. "após as refeições"', () => {
    const s = one('Omeprazol 20mg 12/12h após as refeições');
    expect(s.instructions).toContain('após as refeições');
  });

  it('16. sem frequência => confiança baixa', () => {
    const s = one('Vitamina D 2000 UI');
    expect(s.confidence.schedule).toBe('baixa');
    expect(s.intervalHours).toBeUndefined();
    expect(s.confidence.duration).toBe('baixa');
  });

  it('17. concentração composta mg/ml', () => {
    const s = one('Amoxicilina 250mg/5ml suspensão tomar 5 ml de 8 em 8 horas');
    expect(s.unit).toBe('mg/5ml');
    expect(s.instructions).toContain('5 ml por vez');
  });

  it('18. números diferentes em "X/Y h" não são um intervalo', () => {
    expect(one('Remédio Teste 10mg 3/8h').confidence.schedule).toBe('baixa');
  });
});

describe('prescriptionParser - receita completa', () => {
  const receita = `
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

  it('separa vários medicamentos e ignora o cabeçalho', () => {
    const r = parsePrescription(receita);
    expect(r.map((s) => s.name)).toEqual(['Amoxicilina', 'Dipirona', 'Losartana']);
    expect(r[0].intervalHours).toBe(8);
    expect(r[0].durationDays).toBe(7);
    expect(r[1].intervalHours).toBe(6);
    expect(r[2].continuous).toBe(true);
    expect(r[0].prescriber).toBe('Dr. Carlos Almeida');
  });

  it('texto sem remédios retorna lista vazia', () => {
    expect(parsePrescription('Paciente: João\nData: 10/03/2026\nCRM 123')).toEqual([]);
    expect(parsePrescription('')).toEqual([]);
  });

  it('suggestionToInput devolve dados de formulário, sem salvar nada', () => {
    const input = suggestionToInput(parsePrescription('Amoxicilina 500mg 8/8h por 7 dias')[0], '2026-03-10', 'texto');
    expect(input.status).toBe('active');
    expect(input.startDate).toBe('2026-03-10');
    expect(input.ocrRawText).toBe('texto');
    expect(input.intervalHours).toBe(8);
    expect(input.durationDays).toBe(7);
  });
});
