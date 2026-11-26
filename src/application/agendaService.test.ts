import { describe, expect, it } from 'vitest';
import { buildDose, buildMedication, createInMemoryPorts } from './testing/inMemoryPorts';
import { createAgendaService } from './agendaService';

const day = (y: number, m: number, d: number, h = 0) => new Date(y, m - 1, d, h);

describe('getDayAgenda', () => {
  it('combines doses stored for that day with medications, ignoring other days', async () => {
    const service = createAgendaService(createInMemoryPorts({
      medications: [buildMedication({ id: 'med-1', status: 'paused' })],
      doses: [
        buildDose({ id: 'today', medicationId: 'med-1', scheduledAt: day(2026, 3, 10, 9).getTime() }),
        buildDose({ id: 'tomorrow', medicationId: 'med-1', scheduledAt: day(2026, 3, 11, 9).getTime() }),
      ],
    }));

    const agenda = await service.getDayAgenda(day(2026, 3, 10, 12));

    expect(agenda.map((entry) => (entry.kind === 'logged' ? entry.dose.id : entry))).toEqual(['today']);
  });
});

describe('getDatesWithDoses', () => {
  it('lists dates with a logged dose or a predicted one for an active medication, within range', async () => {
    const service = createAgendaService(createInMemoryPorts({
      medications: [
        buildMedication({ id: 'active', status: 'active', period: { startDate: '2026-03-10', endDate: '2026-03-12' } }),
        buildMedication({ id: 'paused', status: 'paused', period: { startDate: '2026-03-10', endDate: '2026-03-12' } }),
      ],
      doses: [buildDose({ id: 'logged', medicationId: 'paused', scheduledAt: day(2026, 3, 15, 9).getTime() })],
    }));

    const dates = await service.getDatesWithDoses(day(2026, 3, 1), day(2026, 3, 31, 23));

    expect([...dates].sort()).toEqual(['2026-03-10', '2026-03-11', '2026-03-12', '2026-03-15']);
  });
});
