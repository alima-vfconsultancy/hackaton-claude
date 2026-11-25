import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, PencilLine, Pill, X } from 'lucide-react';
import { app } from '../../composition-root';
import { isOpen } from '../../domain/dose';
import { formatDayLong } from '../../shared/ptBR/format';
import { BrandLogo } from '../components/BrandLogo';
import { Disclaimer } from '../components/Disclaimer';
import { DoseCard } from '../components/DoseCard';
import { useLiveData } from '../hooks/useLiveData';
import { useSettings } from '../hooks/useSettings';

const REFRESH_INTERVAL_MS = 60_000;

/** Home screen: the doses of today, with the next one highlighted. */
export default function TodayPage() {
  const settings = useSettings();
  const [missedNotice, setMissedNotice] = useState(0);
  const [tick, setTick] = useState(0);

  // On open: recompute missed doses and show a summary. Then refresh every minute.
  useEffect(() => {
    let isFirstRun = true;
    const refresh = () => app.syncDoses().then((summary) => {
      if (isFirstRun && summary.newlyMissed > 0) setMissedNotice(summary.newlyMissed);
      isFirstRun = false;
      setTick((current) => current + 1);
    });
    void refresh();
    const timer = setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  // `tick` is the dependency on purpose: it moves "now" forward every minute.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => new Date(), [tick]);
  const today = useLiveData(() => app.doses.getToday(now), [tick]);

  const entries = today?.entries ?? [];
  const nextDoseId = entries.find(({ dose }) => isOpen(dose))?.dose.id;

  return (
    <div>
      <header className="mb-4">
        <div className="mb-4">
          <BrandLogo withTagline />
        </div>
        <h1 className="text-2xl">Hoje</h1>
        <p className="text-base text-muted">{formatDayLong(now).replace(/^./, (char) => char.toUpperCase())}</p>
      </header>

      <Disclaimer className="mb-4" />

      {missedNotice > 0 && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border-2 border-red-600 bg-red-50 p-3 text-red-950">
          <p className="flex-1 text-base font-semibold">
            Você deixou passar {missedNotice} {missedNotice === 1 ? 'dose' : 'doses'} desde a última vez. Veja abaixo e registre o que aconteceu.
          </p>
          <button type="button" className="btn-ghost !min-h-10 !px-2" aria-label="Fechar aviso" onClick={() => setMissedNotice(0)}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}

      {today && entries.length === 0 ? (
        <div className="card text-center">
          <Pill className="mx-auto h-12 w-12 text-brand-700" aria-hidden="true" />
          <h2 className="mt-2 text-xl">
            {today.activeMedicationCount === 0 ? 'Vamos começar?' : 'Nenhuma dose para hoje'}
          </h2>
          <p className="mt-1 text-base text-muted">
            {today.activeMedicationCount === 0
              ? 'Tire uma foto da sua receita e o app lê os remédios para você. Ou adicione um remédio manualmente. Leva menos de 1 minuto.'
              : 'Você não tem doses previstas para hoje. Aproveite o dia!'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Doses de hoje">
          {entries.map(({ dose, medication }) => (
            <DoseCard key={dose.id} dose={dose} medication={medication} highlight={dose.id === nextDoseId} snoozeMinutes={settings.snoozeMinutes} />
          ))}
        </ul>
      )}

      <div className="fixed inset-x-0 bottom-16 z-10 pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto max-w-md space-y-2 px-4 pb-2">
          <Link to="/fotografar" className="btn-primary w-full !min-h-14 text-lg shadow-lg">
            <Camera className="h-6 w-6" aria-hidden="true" /> Fotografar receita
          </Link>
          <Link to="/medicamento/novo" className="btn-secondary w-full bg-white">
            <PencilLine className="h-5 w-5" aria-hidden="true" /> Adicionar manualmente
          </Link>
        </div>
      </div>
    </div>
  );
}
