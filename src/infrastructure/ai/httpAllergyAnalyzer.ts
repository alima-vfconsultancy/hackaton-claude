import type { AllergyAnalyzer } from '../../application/ports';
import { parseAllergyAnalysis } from '../../domain/allergyAnalysis';

const DEFAULT_TIMEOUT_MS = 45_000;

/**
 * Talks to the allergy analysis proxy (see `api/analyze-allergy.ts`). The API key never reaches the browser:
 * the proxy holds it. No cookies are sent and the response is validated before use.
 *
 * @param endpoint - full URL of the proxy
 */
export function createHttpAllergyAnalyzer(
  endpoint: string,
  fetcher: typeof fetch = (...args) => fetch(...args),
  timeoutMs = DEFAULT_TIMEOUT_MS,
): AllergyAnalyzer {
  return {
    async analyze(request) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetcher(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          credentials: 'omit',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Allergy analysis failed with status ${response.status}`);
        const items = parseAllergyAnalysis(await response.json());
        if (!items) throw new Error('Allergy analysis returned an unexpected response');
        return items;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
