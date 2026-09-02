'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { NumberGrid } from '../../../components/NumberGrid';
import { NumberStatusLegend } from '../../../components/NumberStatusLegend';
import { SelectionBar } from '../../../components/SelectionBar';
import { CustomerForm } from '../../../components/CustomerForm';
import { SiteHeader } from '../../../components/SiteHeader';
import { useNumberSelection } from '../../../hooks/useNumberSelection';
import { api, ApiError, API_URL } from '../../../services/api';
import { formatCents, formatDate, resolveMediaUrl } from '../../../utils/format';
import type { OrderPublic, RafflePublic } from '../../../types/raffle';

const STATUS_LABEL: Record<RafflePublic['status'], string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativa',
  PAUSED: 'Pausada',
  CLOSED: 'Encerrada',
};

export function RafflePageClient({ raffle }: { raffle: RafflePublic }) {
  const { selected, toggle, clear } = useNumberSelection();
  const [step, setStep] = useState<'grid' | 'identify'>('grid');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const router = useRouter();

  async function handleSubmit(data: { customerName: string; customerPhone: string }) {
    setSubmitting(true);
    setError(null);
    try {
      const order = await api.post<OrderPublic>(`/api/raffles/${raffle.id}/orders`, {
        numbers: selected,
        ...data,
      });
      router.push(`/pedido/${order.publicToken}`);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NUMBER_UNAVAILABLE') {
        setError('Um ou mais números selecionados não estão mais disponíveis. Escolha novamente.');
        clear();
        setStep('grid');
        setRefreshKey((k) => k + 1);
      } else {
        setError(err instanceof ApiError ? err.message : 'Erro inesperado. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-night-blue pb-28 text-off-white sm:pb-8">
      <SiteHeader />
      <header className="border-b border-gold/20 bg-noble-blue/60 px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-4xl">
          {raffle.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveMediaUrl(raffle.coverImageUrl, API_URL)}
              alt={`Prêmio: ${raffle.title}`}
              className="mb-4 max-h-72 w-full rounded-xl border border-gold/30 object-cover"
            />
          )}
          <p className="font-serif text-xs uppercase tracking-widest text-bronze">
            {STATUS_LABEL[raffle.status]}
          </p>
          <h1 className="font-serif text-2xl font-bold text-gold sm:text-4xl">{raffle.title}</h1>
          {raffle.description && <p className="mt-2 max-w-2xl text-sm text-off-white/80">{raffle.description}</p>}

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Stat label="Valor por número" value={formatCents(raffle.unitPriceCents)} />
            <Stat label="Total de números" value={String(raffle.stats.total)} />
            <Stat label="Disponíveis" value={String(raffle.stats.available)} />
            <Stat label="% vendido" value={`${raffle.stats.soldPercentage}%`} />
          </div>
          {raffle.endsAt && (
            <p className="mt-3 text-xs text-off-white/60">Encerra em {formatDate(raffle.endsAt)}</p>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-6 sm:px-8">
        {step === 'grid' && (
          <div className="flex flex-col gap-4">
            <NumberStatusLegend />
            {raffle.status !== 'ACTIVE' ? (
              <p className="rounded-md bg-off-white/10 p-4 text-sm">Esta rifa não está disponível para novas reservas.</p>
            ) : (
              <>
                <NumberGrid raffleId={raffle.id} selected={selected} onToggle={toggle} refreshKey={refreshKey} />
                {error && <p className="text-sm text-rose-400">{error}</p>}
                <SelectionBar
                  selected={selected}
                  unitPriceCents={raffle.unitPriceCents}
                  onClear={clear}
                  onContinue={() => setStep('identify')}
                />
              </>
            )}
          </div>
        )}

        {step === 'identify' && (
          <CustomerForm
            selected={selected}
            unitPriceCents={raffle.unitPriceCents}
            onSubmit={handleSubmit}
            onBack={() => setStep('grid')}
            submitting={submitting}
            error={error}
          />
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gold/20 bg-night-blue/40 p-3">
      <p className="text-[11px] uppercase tracking-wide text-off-white/60">{label}</p>
      <p className="font-serif text-base font-semibold text-gold">{value}</p>
    </div>
  );
}
