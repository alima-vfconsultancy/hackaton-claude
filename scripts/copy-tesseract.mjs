// Copia o worker e o core (wasm) do Tesseract para public/tesseract,
// para que o OCR funcione offline servido pela própria origem.
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public', 'tesseract');
const workerSrc = join(root, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js');
const coreDir = join(root, 'node_modules', 'tesseract.js-core');

if (!existsSync(workerSrc) || !existsSync(coreDir)) {
  console.log('[copy-tesseract] tesseract.js ainda não instalado; pulando.');
  process.exit(0);
}
mkdirSync(out, { recursive: true });
cpSync(workerSrc, join(out, 'worker.min.js'));
// Apenas as variantes LSTM (as usadas com oem padrão), em JS com wasm embutido.
const cores = readdirSync(coreDir).filter((f) => /^tesseract-core.*lstm\.wasm\.js$/.test(f));
for (const f of cores) cpSync(join(coreDir, f), join(out, f));
console.log(`[copy-tesseract] copiados: worker.min.js, ${cores.join(', ')}`);
