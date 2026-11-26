import { NavLink } from 'react-router-dom';
import { CalendarDays, FileDown, History, House, Settings } from 'lucide-react';

const items = [
  { to: '/', label: 'Hoje', Icon: House, end: true },
  { to: '/calendario', label: 'Calendário', Icon: CalendarDays, end: false },
  { to: '/historico', label: 'Histórico', Icon: History, end: false },
  { to: '/exportar', label: 'Exportar', Icon: FileDown, end: false },
  { to: '/configuracoes', label: 'Ajustes', Icon: Settings, end: false },
];

export function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-300 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map(({ to, label, Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 text-sm font-semibold ${
                  isActive ? 'bg-brand-50 text-brand-800' : 'text-slate-700'
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
