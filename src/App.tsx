import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { BottomNav } from './components/BottomNav';
import { DueBanner } from './components/DueBanner';
import { useSettings } from './hooks/useSettings';
import { useReminders } from './hooks/useReminders';
import TodayPage from './pages/TodayPage';
import MedicationEditPage from './pages/MedicationEditPage';
import CapturePage from './pages/CapturePage';
import ReviewPage from './pages/ReviewPage';
import HistoryPage from './pages/HistoryPage';
import MedicationDetailPage from './pages/MedicationDetailPage';
import ExportPage from './pages/ExportPage';
import SettingsPage from './pages/SettingsPage';
import { PageHeader } from './components/PageHeader';

export default function App() {
  const settings = useSettings();
  const { pathname } = useLocation();
  const due = useReminders(settings.notificationsEnabled);

  useEffect(() => {
    document.documentElement.classList.toggle('font-large', settings.fontScale === 'grande');
  }, [settings.fontScale]);

  useEffect(() => window.scrollTo({ top: 0 }), [pathname]);

  const showNav = !['/fotografar', '/revisar'].includes(pathname);

  return (
    <div className={`mx-auto min-h-screen max-w-md px-4 pt-4 ${pathname === '/' ? 'pb-64' : 'pb-24'}`}>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:z-30 focus:bg-white focus:p-2">Ir para o conteúdo</a>
      <DueBanner due={due} />
      <main id="conteudo">
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
