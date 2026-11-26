import { NavLink } from 'react-router-dom';
import { CalendarDays, History, House, Settings, ShieldAlert } from 'lucide-react';

// At most five items with short labels: at 18px each label must fit in ~70px on a 360px screen.
export const NAV_ITEMS = [
  { to: '/', label: 'Hoje', Icon: House, end: true },
  { to: '/calendario', label: 'Agenda', Icon: CalendarDays, end: false },
  { to: '/historico', label: 'Registro', Icon: History, end: false },
  { to: '/alergias', label: 'Alergias', Icon: ShieldAlert, end: false },
  { to: '/configuracoes', label: 'Ajustes', Icon: Settings, end: false },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-300 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {NAV_ITEMS.map(({ to, label, Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                // Labels stay at the 18px brand minimum even with the large font, so the 5 items fit in 360px.
                `flex min-h-16 flex-col items-center justify-center gap-0.5 px-0 text-[18px] font-semibold leading-tight ${
                  isActive ? 'bg-mint text-brand-700' : 'text-muted'
                }`
              }
            >
              <Icon className="h-6 w-6" aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
