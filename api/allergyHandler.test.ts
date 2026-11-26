import { describe, expect, it } from 'vitest';
import { createAllergyHandler } from './allergyHandler';

const ORIGIN = 'https://meuremedio.example';
const item = { medication: 'Novalgina', risk: 'likely' as const, activeIngredients: ['dipirona'], reason: 'Contém dipirona.' };

const post = (body: unknown, headers: Record<string, string> = { Origin: ORIGIN }) =>
  new Request('https://proxy.example/api/analyze-allergy', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

const setup = (analyze = async () => [item]) => {
  const calls: unknown[] = [];
  const handler = createAllergyHandler({
    allowedOrigins: [ORIGIN],
    analyze: async (request) => { calls.push(request); return analyze(); },
  });
  return { handler, calls };
};

describe('allergy proxy handler', () => {
  it('analyzes a valid request and answers with CORS for the allowed origin', async () => {
    const { handler, calls } = setup();

    const response = await handler(post({ medications: [' Novalgina '], allergies: ['Dipirona'] }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ results: [item] });
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);
    expect(calls).toEqual([{ medications: ['Novalgina'], allergies: ['Dipirona'] }]);
  });

  it('answers the preflight and refuses other origins', async () => {
    const { handler, calls } = setup();

    const preflight = await handler(new Request('https://proxy.example', { method: 'OPTIONS', headers: { Origin: ORIGIN } }));
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe(ORIGIN);

    const foreign = await handler(post({ medications: ['A'], allergies: ['B'] }, { Origin: 'https://evil.example' }));
    expect(foreign.status).toBe(403);
    const noOrigin = await handler(post({ medications: ['A'], allergies: ['B'] }, {}));
    expect(noOrigin.status).toBe(403);
    expect(calls).toEqual([]);
  });

  it('only accepts POST', async () => {
    const { handler } = setup();
    const response = await handler(new Request('https://proxy.example', { method: 'GET', headers: { Origin: ORIGIN } }));
    expect(response.status).toBe(405);
  });

  it.each([
    ['not json', '{oops'],
    ['missing lists', {}],
    ['empty medications', { medications: [], allergies: ['A'] }],
    ['empty allergies', { medications: ['A'], allergies: [] }],
    ['too many medications', { medications: Array(11).fill('A'), allergies: ['A'] }],
    ['too many allergies', { medications: ['A'], allergies: Array(21).fill('A') }],
    ['name too long', { medications: ['A'.repeat(101)], allergies: ['A'] }],
    ['non-string name', { medications: [1], allergies: ['A'] }],
  ])('rejects an invalid request (%s) without calling the model', async (_name, body) => {
    const { handler, calls } = setup();
    expect((await handler(post(body))).status).toBe(400);
    expect(calls).toEqual([]);
  });

  it('hides model errors behind a generic 502', async () => {
    const { handler } = setup(async () => { throw new Error('secret upstream detail sk-ant-123'); });

    const response = await handler(post({ medications: ['A'], allergies: ['B'] }));

    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('sk-ant');
  });
});
