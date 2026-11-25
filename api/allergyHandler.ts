import type { AllergyAnalysisItem, AllergyAnalysisRequest } from '../src/domain/allergyAnalysis';

const MAX_MEDICATIONS = 10;
const MAX_ALLERGIES = 20;
const MAX_NAME_LENGTH = 100;

export interface AllergyHandlerDeps {
  /** Origins of the app allowed to call the proxy (CORS). Anything else gets a 403. */
  allowedOrigins: string[];
  analyze(request: AllergyAnalysisRequest): Promise<AllergyAnalysisItem[]>;
}

function cleanNames(value: unknown, maxItems: number): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxItems) return null;
  if (!value.every((name) => typeof name === 'string')) return null;
  const names = (value as string[]).map((name) => name.trim());
  return names.every((name) => name.length > 0 && name.length <= MAX_NAME_LENGTH) ? names : null;
}

function parseRequest(body: unknown): AllergyAnalysisRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const { medications, allergies } = body as Record<string, unknown>;
  const cleanMedications = cleanNames(medications, MAX_MEDICATIONS);
  const cleanAllergies = cleanNames(allergies, MAX_ALLERGIES);
  return cleanMedications && cleanAllergies ? { medications: cleanMedications, allergies: cleanAllergies } : null;
}

/** HTTP logic of the allergy proxy: CORS allow-list, input validation and generic errors. Model-agnostic. */
export function createAllergyHandler({ allowedOrigins, analyze }: AllergyHandlerDeps) {
  return async function handle(request: Request): Promise<Response> {
    const origin = request.headers.get('Origin');
    if (!origin || !allowedOrigins.includes(origin)) return json({ error: 'forbidden' }, 403);
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin',
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, cors);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'invalid_request' }, 400, cors);
    }
    const parsed = parseRequest(body);
    if (!parsed) return json({ error: 'invalid_request' }, 400, cors);

    try {
      return json({ results: await analyze(parsed) }, 200, cors);
    } catch {
      // Never leak upstream details (they may include request ids or key fragments).
      return json({ error: 'analysis_failed' }, 502, cors);
    }
  };
}

function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}
