import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BACKUP_APP_ID } from './application/backup';
import { APP_NAME, BRAND_COLORS } from './shared/brand';

/**
 * Checks that the Dose Certa visual identity (CLAUDE.md, "Identidade visual") is wired into the
 * configuration and the source. Vitest runs in Node without a DOM, so (like architecture.test.ts)
 * these are checks on the source files.
 */
const ROOT = resolve(__dirname, '..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');

function listFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

const appSources = listFiles(join(ROOT, 'src'))
  .filter((file) => /\.(ts|tsx|css)$/.test(file) && !/\.test\.tsx?$/.test(file))
  .map((file) => ({ path: relative(ROOT, file), code: readFileSync(file, 'utf8') }));
const tsxSources = appSources.filter((file) => file.path.endsWith('.tsx'));

const tailwindConfig = read('tailwind.config.js');
const indexCss = read('src/index.css');
const indexHtml = read('index.html');
const viteConfig = read('vite.config.ts');

describe('brand identity: colors and fonts', () => {
  it.each(Object.entries(BRAND_COLORS))('defines the %s color token in Tailwind', (_, hex) => {
    expect(tailwindConfig.toUpperCase()).toContain(hex.toUpperCase());
  });

  it('uses Nunito for display text and Inter for body text', () => {
    expect(tailwindConfig).toMatch(/display:\s*\[\s*'Nunito'/);
    expect(tailwindConfig).toMatch(/sans:\s*\[\s*'Inter'/);
  });

  it('bundles the fonts locally (no Google Fonts request)', () => {
    const main = read('src/main.tsx');
    expect(main).toContain("import '@fontsource/nunito/latin-800.css'");
    expect(main).toContain("import '@fontsource/inter/latin-400.css'");
    for (const { path, code } of [...appSources, { path: 'index.html', code: indexHtml }]) {
      expect(code, path).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
    }
  });

  it('precaches the font files for offline use', () => {
    expect(viteConfig).toMatch(/globPatterns:\s*\[\s*'[^']*woff2/);
  });
});

describe('brand identity: minimum text size of 18px', () => {
  it('sets the root font size to 18px, or 20px with the large font option', () => {
    expect(indexCss).toMatch(/html\s*\{[^}]*font-size:\s*18px/);
    expect(indexCss).toMatch(/html\.font-large\s*\{[^}]*font-size:\s*20px/);
  });

  it('makes text-xs and text-sm as large as the body text', () => {
    expect(tailwindConfig).toMatch(/xs:\s*\[\s*'1rem'/);
    expect(tailwindConfig).toMatch(/sm:\s*\[\s*'1rem'/);
  });
});

describe('brand identity: color usage rules', () => {
  it('never uses amber as a text color', () => {
    const offenders = tsxSources.filter(({ code }) => /\btext-(amber|accent)-\d/.test(code)).map(({ path }) => path);
    expect(offenders).toEqual([]);
  });

  it('replaced the old blue palette', () => {
    const offenders = appSources.filter(({ code }) => /\b(bg|text|border|ring)-blue-\d|#1d4ed8/i.test(code)).map(({ path }) => path);
    expect(offenders).toEqual([]);
  });

  it('paints primary buttons petroleum with white text', () => {
    expect(indexCss).toMatch(/\.btn-primary\s*\{[^}]*bg-brand-700[^}]*text-white/);
  });
});

describe('brand identity: app name', () => {
  it('shows Dose Certa in the page title, the meta tags and the PWA manifest', () => {
    expect(indexHtml).toContain(`<title>${APP_NAME}</title>`);
    expect(indexHtml).toContain(`<meta name="theme-color" content="${BRAND_COLORS.petroleum}" />`);
    expect(viteConfig).toContain(`name: '${APP_NAME}'`);
    expect(viteConfig).toContain(`short_name: '${APP_NAME}'`);
    expect(viteConfig).toContain(`theme_color: '${BRAND_COLORS.petroleum}'`);
    expect(viteConfig).toContain(`background_color: '${BRAND_COLORS.mist}'`);
  });

  it('no longer shows the old name anywhere the user can see it', () => {
    const userFacing = [...appSources, { path: 'index.html', code: indexHtml }, { path: 'vite.config.ts', code: viteConfig }];
    const offenders = userFacing
      .filter(({ code }) => /MeuRem[eé]dio/.test(code.replace("'PRODID:-//MeuRemedio//PT-BR//'", '')))
      .map(({ path }) => path);
    expect(offenders).toEqual([]);
  });

  it('keeps the internal identifiers, so saved data and backups keep working', () => {
    expect(BACKUP_APP_ID).toBe('meu-remedio');
    expect(read('src/infrastructure/persistence/dexie/database.ts')).toContain("constructor(name = 'meu-remedio')");
  });
});
