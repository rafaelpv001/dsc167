'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../services/api';
import { formatCents } from '../../../utils/format';
import type { DashboardStats } from '../../../types/dashboard';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.get<DashboardStats>('/api/admin/reports/dashboard').then(setStats);
  }, []);

  if (!stats) return <p>Carregando...</p>;

  const cards: Array<[string, string]> = [
    ['Rifas ativas', String(stats.activeRaffles)],
    ['Rifas encerradas', String(stats.closedRaffles)],
    ['Total de números', String(stats.totalNumbers)],
    ['Disponíveis', String(stats.availableNumbers)],
    ['Reservados', String(stats.reservedNumbers)],
    ['Pagos', String(stats.paidNumbers)],
    ['% vendido', `${stats.soldPercentage}%`],
    ['Receita confirmada', formatCents(stats.revenueConfirmedCents)],
    ['Receita potencial', formatCents(stats.potentialRevenueCents)],
    ['Aguardando pagamento', String(stats.pendingOrders)],
    ['Expirados', String(stats.expiredOrders)],
    ['Participantes', String(stats.participants)],
  ];

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl font-bold text-gold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-gold/20 bg-noble-blue/40 p-4">
            <p className="text-xs uppercase tracking-wide text-off-white/60">{label}</p>
            <p className="mt-1 font-serif text-xl font-semibold text-gold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
