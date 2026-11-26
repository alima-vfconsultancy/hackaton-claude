import { describe, expect, it } from 'vitest';
import { createHttpAllergyAnalyzer } from './httpAllergyAnalyzer';

const item = { medication: 'Novalgina', risk: 'likely', activeIngredients: ['dipirona'], reason: 'Contém dipirona.' };
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const request = { medications: ['Novalgina'], allergies: ['Dipirona'] };

describe('createHttpAllergyAnalyzer', () => {
  it('posts the request as JSON and returns the validated results', async () => {
    let call: { url: string; init: RequestInit } | undefined;
    const analyzer = createHttpAllergyAnalyzer('https://proxy.example/api/analyze-allergy', async (url, init) => {
      call = { url: String(url), init: init! };
      return jsonResponse({ results: [item] });
    });

    expect(await analyzer.analyze(request)).toEqual([item]);
    expect(call?.url).toBe('https://proxy.example/api/analyze-allergy');
    expect(call?.init.method).toBe('POST');
    expect(JSON.parse(String(call?.init.body))).toEqual(request);
    expect(call?.init.credentials).toBe('omit');
  });

  it('rejects on HTTP errors, malformed bodies and network failures', async () => {
    const failing = (fetcher: typeof fetch) => createHttpAllergyAnalyzer('https://proxy.example', fetcher).analyze(request);

    await expect(failing(async () => jsonResponse({ error: 'x' }, 502))).rejects.toThrow();
    await expect(failing(async () => jsonResponse({ results: [{ ...item, risk: 'high' }] }))).rejects.toThrow();
    await expect(failing(async () => { throw new TypeError('offline'); })).rejects.toThrow();
  });

  it('gives up when the service takes too long', async () => {
    const hanging: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))));

    await expect(createHttpAllergyAnalyzer('https://proxy.example', hanging, 20).analyze(request)).rejects.toThrow();
  });
});
