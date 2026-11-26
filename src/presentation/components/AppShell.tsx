import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { DueDose } from '../../application/reminderService';
import { DueBanner } from './DueBanner';
import { MainNav } from './MainNav';
import { shouldShowNavigation } from './navigationItems';

/**
 * Page frame, mobile first: a single column (`max-w-md`) with a bottom navigation bar. It widens on tablets
 * (`md`) and, from `lg`, leaves room for the side navigation (`lg:pl-60`) and uses a wider content area.
 */
export function AppShell({ due, children }: { due: DueDose[]; children: ReactNode }) {
  const { pathname } = useLocation();
  const showNavigation = shouldShowNavigation(pathname);
  // On phones the Today screen has two fixed action buttons above the bottom bar, hence the extra room.
  const bottomSpace = pathname === '/' ? 'pb-64' : 'pb-24';

  return (
    <div className={`min-h-screen ${showNavigation ? 'lg:pl-60' : ''}`}>
      <div className={`mx-auto max-w-md px-4 pt-4 md:max-w-2xl md:px-6 lg:max-w-5xl lg:px-8 lg:pb-8 lg:pt-8 ${bottomSpace}`}>
        <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:z-30 focus:bg-white focus:p-2">Ir para o conteúdo</a>
        <DueBanner due={due} />
        <main id="content">{children}</main>
      </div>
      {showNavigation && <MainNav />}
    </div>
  );
}
