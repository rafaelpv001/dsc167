'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, ApiError } from '../../../../services/api';
import { formatCents, formatDate } from '../../../../utils/format';
import { GoldButton } from '../../../../components/ui/GoldButton';
import type { DrawStatus, RafflePublic } from '../../../../types/raffle';

const STATUS_LABEL: Record<string, string> = { DRAFT: 'Rascunho', ACTIVE: 'Ativa', PAUSED: 'Pausada', CLOSED: 'Encerrada' };

export default function AdminRaffleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [raffle, setRaffle] = useState<RafflePublic | null>(null);
  const [draw, setDraw] = useState<DrawStatus | null>(null);
  const [confirmDraw, setConfirmDraw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [r, d] = await Promise.all([
      api.get<RafflePublic>(`/api/admin/raffles/${id}`),
      api.get<DrawStatus>(`/api/admin/raffles/${id}/draw`),
    ]);
    setRaffle(r);
    setDraw(d);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);

  async function changeStatus(action: 'publish' | 'pause' | 'close') {
    setError(null);
    try {
      await api.post(`/api/admin/raffles/${id}/${action}`);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao atualizar status.');
    }
  }

  async function executeDraw() {
    setError(null);
    try {
      await api.post(`/api/admin/raffles/${id}/draw`);
      setConfirmDraw(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao realizar sorteio.');
    }
  }

  if (!raffle || !draw) return <p>Carregando...</p>;

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-gold">{raffle.title}</h1>
        <span className="rounded-full bg-off-white/10 px-3 py-1 text-xs">{STATUS_LABEL[raffle.status]}</span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total" value={String(raffle.stats?.total ?? raffle.totalNumbers)} />
        <Stat label="Disponíveis" value={String(raffle.stats?.available ?? '-')} />
        <Stat label="Reservados" value={String(raffle.stats?.reserved ?? '-')} />
        <Stat label="Pagos" value={String(raffle.stats?.paid ?? '-')} />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {raffle.status === 'DRAFT' && <GoldButton onClick={() => changeStatus('publish')}>Publicar</GoldButton>}
        {raffle.status === 'ACTIVE' && (
          <>
            <GoldButton variant="outline" onClick={() => changeStatus('pause')}>
              Pausar
            </GoldButton>
            <GoldButton onClick={() => changeStatus('close')}>Encerrar</GoldButton>
          </>
        )}
        {raffle.status === 'PAUSED' && (
          <>
            <GoldButton onClick={() => changeStatus('publish')}>Reativar</GoldButton>
            <GoldButton onClick={() => changeStatus('close')}>Encerrar</GoldButton>
          </>
        )}
      </div>

      <section className="rounded-xl border border-gold/20 bg-noble-blue/40 p-6">
        <h2 className="mb-3 font-serif text-lg font-semibold text-gold">Sorteio</h2>

        {draw.status === 'DRAWN' && draw.result && (
          <div className="text-sm">
            <p className="font-serif text-2xl font-bold text-gold">🏆 {draw.result.winningNumber}</p>
            <p>Vencedor: {draw.result.winnerDisplayName}</p>
            <p className="text-off-white/60">{formatDate(draw.result.drawnAt)}</p>
          </div>
        )}

        {draw.status === 'NOT_READY' && (
          <p className="text-sm text-off-white/70">
            {raffle.status !== 'CLOSED'
              ? 'Encerre a campanha para liberar o sorteio.'
              : 'Nenhum número pago ainda — sorteio indisponível.'}
          </p>
        )}

        {draw.status === 'READY' && !confirmDraw && (
          <div>
            <p className="mb-3 text-sm">{draw.eligibleNumbersCount} números elegíveis (pagamento confirmado).</p>
            <GoldButton onClick={() => setConfirmDraw(true)}>Realizar sorteio</GoldButton>
          </div>
        )}

        {draw.status === 'READY' && confirmDraw && (
          <div className="rounded-md border border-gold/30 bg-night-blue/60 p-4 text-sm">
            <p className="mb-2">
              Você está prestes a realizar o sorteio da campanha <strong>{raffle.title}</strong>. Participarão somente
              os {draw.eligibleNumbersCount} números com pagamento confirmado. Após confirmado, o resultado será
              registrado permanentemente.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDraw(false)} className="text-off-white/60 underline">
                Cancelar
              </button>
              <GoldButton onClick={executeDraw}>Confirmar sorteio</GoldButton>
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
      </section>

      <p className="mt-4 text-xs text-off-white/50">Valor potencial: {formatCents(raffle.totalNumbers * raffle.unitPriceCents)}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gold/20 bg-noble-blue/30 p-3">
      <p className="text-[11px] uppercase text-off-white/60">{label}</p>
      <p className="font-serif text-lg font-semibold text-gold">{value}</p>
    </div>
  );
}
