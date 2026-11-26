import { CalendarDays, History, House, Settings, ShieldAlert, type LucideIcon } from 'lucide-react';

/** One entry of the main navigation (bottom bar on small screens, side bar on desktop). */
export interface NavigationItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  /** Match the route exactly, so the home item is not active on every page. */
  end: boolean;
}

// Route paths are part of the user-facing URL, so they stay in Portuguese. At most five items with short labels:
// at 18px each label must fit in ~70px on a 360px screen (hence "Agenda" and "Registro"; the page titles stay full).
export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { to: '/', label: 'Hoje', Icon: House, end: true },
  { to: '/calendario', label: 'Agenda', Icon: CalendarDays, end: false },
  { to: '/historico', label: 'Registro', Icon: History, end: false },
  { to: '/alergias', label: 'Alergias', Icon: ShieldAlert, end: false },
  { to: '/configuracoes', label: 'Ajustes', Icon: Settings, end: false },
];

/** Focused flows (photo capture and review) hide the navigation so the user does not leave halfway. */
const FOCUSED_FLOW_ROUTES: readonly string[] = ['/fotografar', '/revisar'];

/** Whether the main navigation is shown for the given route. */
export function shouldShowNavigation(pathname: string): boolean {
  return !FOCUSED_FLOW_ROUTES.includes(pathname);
}
