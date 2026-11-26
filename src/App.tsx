import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './presentation/components/AppShell';
import { PageHeader } from './presentation/components/PageHeader';
import { useNotificationActions } from './presentation/hooks/useNotificationActions';
import { useReminders } from './presentation/hooks/useReminders';
import { useSettings } from './presentation/hooks/useSettings';
import AllergiesPage from './presentation/pages/AllergiesPage';
import CalendarPage from './presentation/pages/CalendarPage';
import CapturePage from './presentation/pages/CapturePage';
import ExportPage from './presentation/pages/ExportPage';
import HistoryPage from './presentation/pages/HistoryPage';
import MedicationDetailPage from './presentation/pages/MedicationDetailPage';
import MedicationEditPage from './presentation/pages/MedicationEditPage';
import ReviewPage from './presentation/pages/ReviewPage';
import SettingsPage from './presentation/pages/SettingsPage';
import TodayPage from './presentation/pages/TodayPage';

export default function App() {
  const settings = useSettings();
  const { pathname } = useLocation();
  const due = useReminders(settings.notificationsEnabled);
  useNotificationActions();

  useEffect(() => {
    document.documentElement.classList.toggle('font-large', settings.fontScale === 'large');
  }, [settings.fontScale]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <AppShell due={due}>
      <Routes>
        {/* Route paths are part of the user-facing URL, so they stay in Portuguese. */}
        <Route path="/" element={<TodayPage />} />
        <Route path="/calendario" element={<CalendarPage />} />
        <Route path="/fotografar" element={<CapturePage />} />
        <Route path="/revisar" element={<ReviewPage />} />
        <Route path="/medicamento/novo" element={<MedicationEditPage />} />
        <Route path="/medicamento/:id/editar" element={<MedicationEditPage />} />
        <Route path="/historico" element={<HistoryPage />} />
        <Route path="/historico/:id" element={<MedicationDetailPage />} />
        <Route path="/alergias" element={<AllergiesPage />} />
        <Route path="/exportar" element={<ExportPage />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
        <Route path="*" element={<PageHeader title="Página não encontrada" back="/" />} />
      </Routes>
    </AppShell>
  );
}
