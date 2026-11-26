import { CalendarDays, FileDown, History, House, Settings, type LucideIcon } from 'lucide-react';

/** One entry of the main navigation (bottom bar on small screens, side bar on desktop). */
export interface NavigationItem {
  to: string;
  label: string;
  Icon: LucideIcon;
  /** Match the route exactly, so the home item is not active on every page. */
  end: boolean;
}

// Route paths are part of the user-facing URL, so they stay in Portuguese.
export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { to: '/', label: 'Hoje', Icon: House, end: true },
  { to: '/calendario', label: 'Calendário', Icon: CalendarDays, end: false },
  { to: '/historico', label: 'Histórico', Icon: History, end: false },
  { to: '/exportar', label: 'Exportar', Icon: FileDown, end: false },
  { to: '/configuracoes', label: 'Ajustes', Icon: Settings, end: false },
];

/** Focused flows (photo capture and review) hide the navigation so the user does not leave halfway. */
const FOCUSED_FLOW_ROUTES: readonly string[] = ['/fotografar', '/revisar'];

/** Whether the main navigation is shown for the given route. */
export function shouldShowNavigation(pathname: string): boolean {
  return !FOCUSED_FLOW_ROUTES.includes(pathname);
}
