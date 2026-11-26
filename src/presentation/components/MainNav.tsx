import { NavLink } from 'react-router-dom';
import { BrandLogo } from './BrandLogo';
import { NAVIGATION_ITEMS } from './navigationItems';

/**
 * Main navigation. Mobile first: a fixed bottom bar (phones and tablets). From `lg` it becomes a fixed
 * left side bar with the logo on top. One element, so there is a single "navigation" landmark.
 */
export function MainNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-300 bg-white pb-[env(safe-area-inset-bottom)] lg:inset-y-0 lg:right-auto lg:w-60 lg:overflow-y-auto lg:border-r lg:border-t-0 lg:p-4"
    >
      <div className="mb-6 hidden px-2 lg:block">
        <BrandLogo />
      </div>
      <ul className="mx-auto grid max-w-md grid-cols-5 lg:flex lg:max-w-none lg:flex-col lg:gap-1">
        {NAVIGATION_ITEMS.map(({ to, label, Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                // Labels stay at the 18px brand minimum even with the large font, so the 5 items fit in 360px.
                `flex min-h-16 flex-col items-center justify-center gap-0.5 px-0 text-[18px] font-semibold leading-tight lg:min-h-12 lg:flex-row lg:justify-start lg:gap-3 lg:rounded-xl lg:px-4 lg:text-base ${
                  isActive ? 'bg-mint text-brand-700' : 'text-muted lg:hover:bg-mist'
                }`
              }
            >
              <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
