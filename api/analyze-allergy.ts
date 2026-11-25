import { createAllergyHandler } from './allergyHandler';
import { createClaudeAnalyzer } from './claudeAnalyzer';

/**
 * Vercel serverless function: POST /api/analyze-allergy
 * Environment: ANTHROPIC_API_KEY (secret, only here) and ALLOWED_ORIGINS (comma-separated app origins).
 */
const handler = createAllergyHandler({
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean),
  analyze: createClaudeAnalyzer(),
});

export const POST = handler;
export const OPTIONS = handler;
