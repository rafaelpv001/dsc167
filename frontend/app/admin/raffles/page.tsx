'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../../services/api';
import { formatCents } from '../../../utils/format';
import type { RafflePublic } from '../../../types/raffle';

const STATUS_LABEL: Record<string, string> = { DRAFT: 'Rascunho', ACTIVE: 'Ativa', PAUSED: 'Pausada', CLOSED: 'Encerrada' };

export default function AdminRafflesPage() {
  const [raffles, setRaffles] = useState<RafflePublic[]>([]);

  useEffect(() => {
    api.get<RafflePublic[]>('/api/admin/raffles').then(setRaffles);
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-gold">Rifas</h1>
        <Link href="/admin/raffles/new" className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-night-blue">
          Nova rifa
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gold/20">
        <table className="w-full text-left text-sm">
          <thead className="bg-noble-blue/60 text-off-white/70">
            <tr>
              <th className="p-3">Título</th>
              <th className="p-3">Status</th>
              <th className="p-3">Números</th>
              <th className="p-3">Valor</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {raffles.map((r) => (
              <tr key={r.id} className="border-t border-gold/10">
                <td className="p-3">{r.title}</td>
                <td className="p-3">{STATUS_LABEL[r.status]}</td>
                <td className="p-3">{r.totalNumbers}</td>
                <td className="p-3">{formatCents(r.unitPriceCents)}</td>
                <td className="p-3">
                  <Link href={`/admin/raffles/${r.id}`} className="text-gold underline">
                    Detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
