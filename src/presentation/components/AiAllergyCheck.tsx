import { useState } from 'react';
import { CircleCheck, OctagonAlert, Sparkles, TriangleAlert } from 'lucide-react';
import { app } from '../../composition-root';
import type { AllergyAnalysisItem, AllergyRisk } from '../../domain/allergyAnalysis';
import { AI_CHECK_CONSENT_MESSAGE, AI_CHECK_CONSENT_TITLE, AI_CHECK_STATUS_MESSAGES } from '../i18n/messages';
import { ConfirmDialog } from './ConfirmDialog';

const RISK_VIEW: Record<AllergyRisk, { label: string; Icon: typeof CircleCheck; className: string }> = {
  none: { label: 'Nenhuma relação encontrada', Icon: CircleCheck, className: 'border-green-700 bg-green-50 text-green-950' },
  possible: { label: 'Possível relação com sua alergia', Icon: TriangleAlert, className: 'border-accent-600 bg-accent-100 text-ink' },
  likely: { label: 'Provável alergia', Icon: OctagonAlert, className: 'border-red-600 bg-red-50 text-red-950' },
};

/**
 * Optional check by an AI service. It only runs when the user taps the button (after agreeing once)
 * and it is a suggestion: it never blocks saving nor creates anything on its own.
 */
export function AiAllergyCheck({ medicationNames }: { medicationNames: string[] }) {
  const [asking, setAsking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AllergyAnalysisItem[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!app.allergies.isAiAvailable()) return null;

  async function run() {
    setLoading(true);
    setMessage(null);
    setItems(null);
    const result = await app.allergies.analyzeWithAi(medicationNames);
    setLoading(false);
    if (result.status === 'ok') setItems(result.items);
    else if (result.status === 'consent_required') setAsking(true);
    else setMessage(AI_CHECK_STATUS_MESSAGES[result.status]);
  }

  async function agreeAndRun() {
    setAsking(false);
    await app.settings.save({ allergyAiConsent: true });
    await run();
  }

  return (
    <section className="card mb-4" aria-labelledby="ai-check-title">
      <h2 id="ai-check-title" className="flex items-center gap-2 text-xl font-bold">
        <Sparkles className="h-6 w-6" aria-hidden="true" /> Verificar alergias com IA
      </h2>
      <p className="mt-1 text-base">A IA descobre os princípios ativos de cada remédio e compara com as suas alergias, mesmo que o nome seja uma marca. É só uma ajuda: pode errar.</p>
      <button type="button" className="btn-secondary mt-3 w-full" disabled={loading || medicationNames.every((name) => !name.trim())} onClick={run}>
        {loading ? 'Verificando…' : 'Verificar agora'}
      </button>
      <div role="status" aria-live="polite">
        {message && <p className="mt-3 font-semibold">{message}</p>}
        {items && items.length > 0 && (
          <ul className="mt-3 space-y-2">
            {items.map((item, index) => {
              const { label, Icon, className } = RISK_VIEW[item.risk];
              return (
                <li key={`${item.medication}-${index}`} className={`flex gap-2 rounded-xl border-2 p-3 ${className}`}>
                  <Icon className="mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="break-words font-bold">{item.medication}: {label}</p>
                    {item.activeIngredients.length > 0 && <p className="break-words text-sm">Princípio ativo: {item.activeIngredients.join(', ')}</p>}
                    <p className="break-words">{item.reason}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <ConfirmDialog open={asking} title={AI_CHECK_CONSENT_TITLE} message={AI_CHECK_CONSENT_MESSAGE}
        confirmLabel="Concordo e verificar" onCancel={() => setAsking(false)} onConfirm={agreeAndRun} />
    </section>
  );
}
