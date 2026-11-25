import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../domain/settings';
import { createAllergyService } from './allergyService';
import { createInMemoryPorts } from './testing/inMemoryPorts';

const setup = () => {
  const ports = createInMemoryPorts();
  return { ports, service: createAllergyService(ports) };
};

describe('add', () => {
  it('stores a trimmed allergy with an id and creation time', async () => {
    const { ports, service } = setup();

    const result = await service.add({ substance: '  Dipirona ', notes: ' causa urticária ' });

    expect(result).toEqual({ ok: true });
    expect(ports.store.allergies).toEqual([
      expect.objectContaining({ id: 'id-1', substance: 'Dipirona', notes: 'causa urticária' }),
    ]);
  });

  it('returns the issue codes and stores nothing when the draft is invalid', async () => {
    const { ports, service } = setup();
    await service.add({ substance: 'Dipirona', notes: '' });

    expect(await service.add({ substance: 'dipirona', notes: '' })).toEqual({ ok: false, issues: ['substance_duplicated'] });
    expect(await service.add({ substance: ' ', notes: '' })).toEqual({ ok: false, issues: ['substance_required'] });
    expect(ports.store.allergies).toHaveLength(1);
  });
});

describe('list, remove and check', () => {
  it('lists alphabetically and removes by id', async () => {
    const { service } = setup();
    await service.add({ substance: 'Penicilina', notes: '' });
    await service.add({ substance: 'Dipirona', notes: '' });

    const listed = await service.list();
    expect(listed.map((a) => a.substance)).toEqual(['Dipirona', 'Penicilina']);

    await service.remove(listed[0].id);
    expect((await service.list()).map((a) => a.substance)).toEqual(['Penicilina']);
  });

  it('flags medication names that contain a registered substance', async () => {
    const { service } = setup();
    await service.add({ substance: 'Dipirona', notes: '' });

    expect((await service.check('Dipirona sódica 500 mg')).map((a) => a.substance)).toEqual(['Dipirona']);
    expect(await service.check('Losartana')).toEqual([]);
  });
});

describe('analyzeWithAi', () => {
  const item = { medication: 'Novalgina', risk: 'likely' as const, activeIngredients: ['dipirona'], reason: 'Contém dipirona.' };

  const setupAi = async (analyzer: { analyze: (request: { medications: string[]; allergies: string[] }) => Promise<typeof item[]> } | null, consent = true) => {
    const ports = createInMemoryPorts();
    if (consent) await ports.settings.save({ ...DEFAULT_SETTINGS, allergyAiConsent: true });
    const service = createAllergyService(ports, analyzer);
    await service.add({ substance: 'Dipirona', notes: '' });
    return service;
  };

  it('is unavailable when no analyzer is configured', async () => {
    const service = await setupAi(null);
    expect(service.isAiAvailable()).toBe(false);
    expect(await service.analyzeWithAi(['Novalgina'])).toEqual({ status: 'unavailable' });
  });

  it('does not send anything before the user consents', async () => {
    let calls = 0;
    const service = await setupAi({ analyze: async () => { calls++; return [item]; } }, false);

    expect(await service.analyzeWithAi(['Novalgina'])).toEqual({ status: 'consent_required' });
    expect(calls).toBe(0);
  });

  it('does not call the analyzer when there are no allergies or no medication names', async () => {
    let calls = 0;
    const ports = createInMemoryPorts();
    await ports.settings.save({ ...DEFAULT_SETTINGS, allergyAiConsent: true });
    const service = createAllergyService(ports, { analyze: async () => { calls++; return []; } });

    expect(await service.analyzeWithAi(['Novalgina'])).toEqual({ status: 'no_allergies' });
    await service.add({ substance: 'Dipirona', notes: '' });
    expect(await service.analyzeWithAi(['  ', ''])).toEqual({ status: 'ok', items: [] });
    expect(calls).toBe(0);
  });

  it('sends only medication names and allergy substances', async () => {
    let sent: unknown;
    const service = await setupAi({ analyze: async (request) => { sent = request; return [item]; } });

    const result = await service.analyzeWithAi([' Novalgina ', 'Losartana']);

    expect(sent).toEqual({ medications: ['Novalgina', 'Losartana'], allergies: ['Dipirona'] });
    expect(result).toEqual({ status: 'ok', items: [item] });
  });

  it('reports a failure instead of throwing when the analyzer fails', async () => {
    const service = await setupAi({ analyze: async () => { throw new Error('network'); } });
    expect(await service.analyzeWithAi(['Novalgina'])).toEqual({ status: 'failed' });
  });
});
