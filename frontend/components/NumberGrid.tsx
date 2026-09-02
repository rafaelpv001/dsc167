'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import type { RaffleNumberItem, RaffleNumberStatus } from '../types/raffle';

// A grade é contínua (sem paginação visível): o componente busca todas as
// páginas do backend internamente (em lotes de FETCH_BATCH_SIZE) e renderiza
// tudo junto num único grid rolável.
const FETCH_BATCH_SIZE = 500;

const STATUS_STYLES: Record<RaffleNumberStatus, string> = {
  AVAILABLE: 'bg-emerald-500/90 text-white hover:brightness-110',
  RESERVED: 'bg-amber-400/90 text-night-blue cursor-not-allowed',
  PAID: 'bg-rose-600/90 text-white cursor-not-allowed',
};

const STATUS_LABEL: Record<RaffleNumberStatus, string> = {
  AVAILABLE: 'Disponível',
  RESERVED: 'Reservado',
  PAID: 'Pago',
};

interface Props {
  raffleId: string;
  selected: string[];
  onToggle: (number: string) => void;
  refreshKey: number;
}

type Filter = 'ALL' | RaffleNumberStatus;

export function NumberGrid({ raffleId, selected, onToggle, refreshKey }: Props) {
  const [items, setItems] = useState<RaffleNumberItem[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      const params = new URLSearchParams({ pageSize: String(FETCH_BATCH_SIZE) });
      if (filter !== 'ALL') params.set('status', filter);
      if (search) params.set('search', search);

      const collected: RaffleNumberItem[] = [];
      let page = 1;
      for (;;) {
        params.set('page', String(page));
        const res = await api.get<{ items: RaffleNumberItem[]; total: number }>(
          `/api/raffles/${raffleId}/numbers?${params}`,
        );
        collected.push(...res.items);
        if (cancelled || collected.length >= res.total || res.items.length === 0) break;
        page += 1;
      }

      if (!cancelled) {
        setItems(collected);
        setLoading(false);
      }
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [raffleId, filter, search, refreshKey]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['ALL', 'AVAILABLE', 'RESERVED', 'PAID'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              filter === f ? 'border-gold bg-gold/20 text-gold' : 'border-off-white/20 text-off-white/70'
            }`}
          >
            {f === 'ALL' ? 'Todos' : STATUS_LABEL[f]}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value.replace(/\D/g, ''))}
          placeholder="Buscar número"
          className="ml-auto w-32 rounded-md border border-off-white/20 bg-transparent px-3 py-1 text-sm text-off-white placeholder:text-off-white/40"
        />
      </div>

      <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10" aria-busy={loading}>
        {items.map((item) => {
          const isSelected = selectedSet.has(item.number);
          return (
            <button
              key={item.number}
              type="button"
              disabled={item.status !== 'AVAILABLE'}
              title={`Número ${item.number} - ${STATUS_LABEL[item.status]}`}
              onClick={() => onToggle(item.number)}
              className={`rounded-md py-2 text-center text-xs font-semibold ring-2 transition ${
                isSelected ? 'ring-gold' : 'ring-transparent'
              } ${STATUS_STYLES[item.status]}`}
            >
              {item.number}
            </button>
          );
        })}
      </div>

      {loading && items.length === 0 && (
        <p className="text-center text-sm text-off-white/60">Carregando números...</p>
      )}
    </div>
  );
}
