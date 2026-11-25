import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { endOfDay, startOfDay } from 'date-fns';
import { Camera, PencilLine, Pill, X } from 'lucide-react';
import { db } from '../db/db';
import { syncDoses } from '../lib/maintenance';
import { effectiveTime, isOpen } from '../lib/doseRules';
import { fmtDayLong } from '../lib/format';
import { DoseCard } from '../components/DoseCard';
import { Disclaimer } from '../components/Disclaimer';
import { useSettings } from '../hooks/useSettings';

export default function TodayPage() {
  const settings = useSettings();
  const [missedNotice, setMissedNotice] = useState(0);
  const [tick, setTick] = useState(0);

  // Ao abrir: recalcula doses perdidas e mostra um resumo. Depois, a cada minuto.
  useEffect(() => {
    let first = true;
    const run = () => syncDoses().then((s) => {
      if (first && s.newlyMissed > 0) setMissedNotice(s.newlyMissed);
      first = false;
      setTick((t) => t + 1);
    });
    run();
    const i = setInterval(run, 60_000);
    return () => clearInterval(i);
  }, []);

  const now = useMemo(() => new Date(), [tick]);
  const data = useLiveQuery(async () => {
    const doses = await db.doseLogs
      .where('scheduledAt').between(startOfDay(now).getTime(), endOfDay(now).getTime(), true, true).toArray();
    const meds = await db.medications.toArray();
    const medCount = await db.medications.where('status').equals('active').count();
    return { doses, meds: new Map(meds.map((m) => [m.id, m])), medCount };
  }, [tick]);

  const doses = (data?.doses ?? [])
    .filter((d) => data?.meds.has(d.medicationId))
    .sort((a, b) => effectiveTime(a) - effectiveTime(b));
  const nextId = doses.find((d) => isOpen(d))?.id;
  const loaded = data !== undefined;

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Hoje</h1>
        <p className="text-base text-slate-700">{fmtDayLong(now).replace(/^./, (c) => c.toUpperCase())}</p>
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

      {loaded && doses.length === 0 ? (
        <div className="card text-center">
          <Pill className="mx-auto h-12 w-12 text-brand-700" aria-hidden="true" />
          <h2 className="mt-2 text-xl font-bold">
            {data.medCount === 0 ? 'Vamos começar?' : 'Nenhuma dose para hoje'}
          </h2>
          <p className="mt-1 text-base text-slate-700">
            {data.medCount === 0
              ? 'Tire uma foto da sua receita e o app lê os remédios para você. Ou adicione um remédio manualmente. Leva menos de 1 minuto.'
              : 'Você não tem doses previstas para hoje. Aproveite o dia!'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3" aria-label="Doses de hoje">
          {doses.map((d) => (
            <DoseCard key={d.id} dose={d} med={data!.meds.get(d.medicationId)!} highlight={d.id === nextId} snoozeMinutes={settings.snoozeMinutes} />
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
