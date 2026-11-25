import type { Plugin } from 'vite';
import { loadEnv } from 'vite';

/**
 * Dev only: serves `api/analyze-allergy.ts` inside `npm run dev`, so no extra tool is needed.
 * Secrets (ANTHROPIC_API_KEY, ALLOWED_ORIGINS) come from `.env.local`; they stay in the Node process.
 */
export function devApiPlugin(mode: string): Plugin {
  return {
    name: 'dev-api',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(mode, process.cwd(), '');
      process.env.ANTHROPIC_API_KEY ??= env.ANTHROPIC_API_KEY;
      process.env.ALLOWED_ORIGINS ??= env.ALLOWED_ORIGINS;

      server.middlewares.use('/api/analyze-allergy', async (req, res) => {
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
          const request = new Request(`http://${req.headers.host}${req.url}`, {
            method: req.method,
            headers: req.headers as Record<string, string>,
            body: hasBody ? Buffer.concat(chunks) : undefined,
          });
          const module = await server.ssrLoadModule('/api/analyze-allergy.ts');
          const handler = (req.method === 'OPTIONS' ? module.OPTIONS : module.POST) as (request: Request) => Promise<Response>;
          const response = await handler(request);
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch {
          res.statusCode = 500;
          res.end('{"error":"dev_api_failed"}');
        }
      });
    },
  };
}
