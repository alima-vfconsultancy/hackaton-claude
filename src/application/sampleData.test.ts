import { describe, expect, it } from 'vitest';
import { validateMedicationDraft } from '../domain/medication';
import { createInMemoryPorts } from './testing/inMemoryPorts';
import { createMedicationService } from './medicationService';
import { buildSampleDrafts, createSampleDataService } from './sampleData';
import { createSyncDoses } from './syncDoses';

describe('buildSampleDrafts', () => {
  const today = new Date(2026, 2, 10, 12);

  it('builds three valid medications', () => {
    const drafts = buildSampleDrafts(today);
    expect(drafts.map((d) => d.name)).toEqual(['Amoxicilina', 'Losartana', 'Omeprazol']);
    for (const draft of drafts) expect(validateMedicationDraft(draft)).toEqual([]);
  });

  it('starts each treatment in the past and keeps Losartana continuous', () => {
    const [amoxicillin, losartan, omeprazole] = buildSampleDrafts(today);
    expect(amoxicillin.period).toEqual({ startDate: '2026-03-09', endDate: '2026-03-15' });
    expect(losartan.period).toEqual({ startDate: '2026-02-08' });
    expect(omeprazole.period).toEqual({ startDate: '2026-02-18', endDate: '2026-03-03' });
  });
});

describe('SampleDataService', () => {
  it('creates the demo medications', async () => {
    const ports = createInMemoryPorts();
    const medications = createMedicationService(ports, createSyncDoses(ports));

    await createSampleDataService(medications).load();

    expect(ports.store.medications).toHaveLength(3);
  });
});
