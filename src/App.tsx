import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav } from './presentation/components/BottomNav';
import { DueBanner } from './presentation/components/DueBanner';
import { PageHeader } from './presentation/components/PageHeader';
import { useReminders } from './presentation/hooks/useReminders';
import { useSettings } from './presentation/hooks/useSettings';
import CapturePage from './presentation/pages/CapturePage';
import ExportPage from './presentation/pages/ExportPage';
import HistoryPage from './presentation/pages/HistoryPage';
import MedicationDetailPage from './presentation/pages/MedicationDetailPage';
import MedicationEditPage from './presentation/pages/MedicationEditPage';
import ReviewPage from './presentation/pages/ReviewPage';
import SettingsPage from './presentation/pages/SettingsPage';
import TodayPage from './presentation/pages/TodayPage';

// Route paths are part of the user-facing URL, so they stay in Portuguese.
const FULL_SCREEN_ROUTES = ['/fotografar', '/revisar'];

export default function App() {
  const settings = useSettings();
  const { pathname } = useLocation();
  const due = useReminders(settings.notificationsEnabled);

  useEffect(() => {
    document.documentElement.classList.toggle('font-large', settings.fontScale === 'large');
  }, [settings.fontScale]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  const showNav = !FULL_SCREEN_ROUTES.includes(pathname);

  return (
    <div className={`mx-auto min-h-screen max-w-md px-4 pt-4 ${pathname === '/' ? 'pb-64' : 'pb-24'}`}>
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:z-30 focus:bg-white focus:p-2">Ir para o conteúdo</a>
      <DueBanner due={due} />
      <main id="content">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/fotografar" element={<CapturePage />} />
          <Route path="/revisar" element={<ReviewPage />} />
          <Route path="/medicamento/novo" element={<MedicationEditPage />} />
          <Route path="/medicamento/:id/editar" element={<MedicationEditPage />} />
          <Route path="/historico" element={<HistoryPage />} />
          <Route path="/historico/:id" element={<MedicationDetailPage />} />
          <Route path="/exportar" element={<ExportPage />} />
          <Route path="/configuracoes" element={<SettingsPage />} />
          <Route path="*" element={<PageHeader title="Página não encontrada" back="/" />} />
        </Routes>
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}
