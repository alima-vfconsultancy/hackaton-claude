import { APP_NAME, APP_TAGLINE, BRAND_COLORS } from '../../shared/brand';

/** Same geometry as scripts/brand-symbol.mjs (512 frame, capsule rotated -45° with a check). */
const BASE_HALF = 'M256 160H144.5A96 96 0 0 0 144.5 352H256Z';
const TOP_HALF = 'M256 160H367.5A96 96 0 0 1 367.5 352H256Z';
const CHECK = 'M260 224L288 250L334 192';

/** The capsule-with-check symbol, light version (for light backgrounds). Decorative: the name is text. */
export function BrandSymbol({ className }: { className?: string }) {
  return (
    <svg viewBox="72 72 368 368" className={className} aria-hidden="true" focusable="false">
      <g transform="rotate(-45 256 256)">
        <path d={BASE_HALF} fill={BRAND_COLORS.petroleum} />
        <path d={TOP_HALF} fill={BRAND_COLORS.amber} />
      </g>
      <path d={CHECK} fill="none" stroke={BRAND_COLORS.petroleum} strokeWidth={24} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Horizontal Dose Certa logo: symbol, name ("Dose" extra bold, "Certa" regular) and, optionally, the tagline. */
export function BrandLogo({ withTagline = false }: { withTagline?: boolean }) {
  const [first, ...rest] = APP_NAME.split(' ');
  return (
    <div className="flex items-center gap-3">
      <BrandSymbol className="h-12 w-12 shrink-0" />
      <div>
        <p className="font-display text-2xl leading-tight text-brand-700">
          <span className="font-extrabold">{first}</span> <span className="font-normal">{rest.join(' ')}</span>
        </p>
        {withTagline && <p className="text-base text-muted">{APP_TAGLINE}</p>}
      </div>
    </div>
  );
}
