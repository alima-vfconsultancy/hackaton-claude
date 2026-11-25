import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Enforces the dependency rule of docs/architecture.md (ADR-0004):
 *
 *   presentation -> application -> domain      infrastructure -> application, domain
 *   shared -> domain                           composition-root wires everything
 */

type Layer = 'domain' | 'shared' | 'application' | 'infrastructure' | 'presentation' | 'bootstrap';

const SRC = resolve(__dirname);

const ALLOWED_LAYERS: Record<Layer, Layer[]> = {
  domain: ['domain'],
  shared: ['shared', 'domain'],
  application: ['application', 'domain', 'shared'],
  infrastructure: ['infrastructure', 'application', 'domain', 'shared'],
  // Presentation reaches the adapters only through the composition root.
  presentation: ['presentation', 'application', 'domain', 'shared'],
  bootstrap: ['bootstrap', 'presentation', 'application', 'infrastructure', 'domain', 'shared'],
};

/** Packages that may only be imported by the listed layers (everything else is forbidden). */
const PACKAGE_OWNERS: Array<{ pattern: RegExp; layers: Layer[]; reason: string }> = [
  { pattern: /^(dexie|tesseract\.js|jspdf|jspdf-autotable)(\/|$)/, layers: ['infrastructure'], reason: 'adapter libraries belong to infrastructure' },
  { pattern: /^(react|react-dom|react-router-dom|lucide-react|react-day-picker)(\/|$)/, layers: ['presentation', 'bootstrap'], reason: 'UI libraries belong to presentation' },
];

/** The single presentation file allowed to know about live queries. */
const LIVE_QUERY_FILE = join('presentation', 'hooks', 'useLiveData.ts');

/** Browser globals that must not appear in layers that have to stay testable in plain Node. */
const BROWSER_GLOBALS = /\b(window|document|navigator|localStorage|sessionStorage|indexedDB|Notification|import\.meta)\b/;
const PURE_LAYERS: Layer[] = ['domain', 'shared', 'application'];

interface SourceFile {
  path: string; // relative to src, using the OS separator
  layer: Layer;
  isTest: boolean;
  code: string;
}

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

function layerOf(path: string): Layer {
  if (['App', 'App.tsx', 'main', 'main.tsx'].includes(path)) return 'presentation';
  const [first] = path.split(sep);
  return (['domain', 'shared', 'application', 'infrastructure', 'presentation'] as const).find((layer) => layer === first) ?? 'bootstrap';
}

const stripComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const sources: SourceFile[] = listFiles(SRC)
  .filter((file) => /\.(ts|tsx)$/.test(file) && !file.endsWith('.d.ts'))
  .map((file) => {
    const path = relative(SRC, file);
    return { path, layer: layerOf(path), isTest: /\.test\.tsx?$/.test(path), code: stripComments(readFileSync(file, 'utf8')) };
  });

function importsOf(code: string): string[] {
  const specifiers: string[] = [];
  const pattern = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const match of code.matchAll(pattern)) specifiers.push(match[1] ?? match[2] ?? match[3]);
  return specifiers;
}

/** Resolves a relative import to the layer it points into (or `null` for package imports). */
function targetLayer(from: SourceFile, specifier: string): { layer: Layer; path: string } | null {
  if (!specifier.startsWith('.')) return null;
  const path = relative(SRC, resolve(dirname(join(SRC, from.path)), specifier));
  return { layer: layerOf(path), path };
}

describe('architecture: dependency rule', () => {
  it('finds the source files of every layer', () => {
    const layers = new Set(sources.map((file) => file.layer));
    expect([...layers].sort()).toEqual(['application', 'bootstrap', 'domain', 'infrastructure', 'presentation', 'shared']);
  });

  it('only imports from layers a layer is allowed to depend on', () => {
    const violations: string[] = [];
    for (const file of sources) {
      for (const specifier of importsOf(file.code)) {
        const target = targetLayer(file, specifier);
        if (!target || /\.css$/.test(specifier)) continue;
        const isCompositionRoot = target.path === 'composition-root';
        if (file.layer === 'presentation' && isCompositionRoot) continue;
        if (!ALLOWED_LAYERS[file.layer].includes(target.layer)) {
          violations.push(`${file.path} (${file.layer}) must not import ${specifier} (${target.layer})`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('keeps third-party libraries inside the layers that own them', () => {
    const violations: string[] = [];
    for (const file of sources) {
      for (const specifier of importsOf(file.code)) {
        for (const { pattern, layers, reason } of PACKAGE_OWNERS) {
          if (pattern.test(specifier) && !layers.includes(file.layer)) violations.push(`${file.path} imports ${specifier}: ${reason}`);
        }
        if (specifier.startsWith('dexie-react-hooks') && file.path !== LIVE_QUERY_FILE) {
          violations.push(`${file.path} imports ${specifier}: live queries are wrapped by ${LIVE_QUERY_FILE}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('keeps browser globals out of domain, shared and application code', () => {
    const violations = sources
      .filter((file) => PURE_LAYERS.includes(file.layer) && !file.isTest)
      .filter((file) => BROWSER_GLOBALS.test(file.code))
      .map((file) => `${file.path} uses a browser global`);
    expect(violations).toEqual([]);
  });
});
