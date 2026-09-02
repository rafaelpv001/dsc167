'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../services/api';
import { formatCents, formatDate } from '../../../utils/format';
import type { AdminOrder } from '../../../types/order-admin';
import type { OrderStatus } from '../../../types/raffle';

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Aguardando pagamento',
  PAID: 'Pago',
  REJECTED: 'Rejeitado',
  EXPIRED: 'Expirado',
  CANCELLED: 'Cancelado',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    api.get<AdminOrder[]>(`/api/admin/orders?${params}`).then(setOrders);
  }, [status, search]);

  async function approve(id: string) {
    await api.post(`/api/admin/orders/${id}/approve`, { note: 'Confirmado manualmente pelo admin.' });
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'PAID' } : o)));
  }

  function whatsappLink(order: AdminOrder) {
    const text = encodeURIComponent(
      `Olá, ${order.customer.name}. Estamos entrando em contato sobre sua reserva do pedido ${order.code}.`,
    );
    return `https://wa.me/55${order.customer.phone}?text=${text}`;
  }

  return (
    <div>
      <h1 className="mb-6 font-serif text-2xl font-bold text-gold">Pedidos</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | '')}
          className="rounded-md border border-off-white/20 bg-transparent px-3 py-2 text-sm"
        >
          <option value="">Todos</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar nome, WhatsApp, código..."
          className="flex-1 rounded-md border border-off-white/20 bg-transparent px-3 py-2 text-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gold/20">
        <table className="w-full text-left text-sm">
          <thead className="bg-noble-blue/60 text-off-white/70">
            <tr>
              <th className="p-3">Código</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Rifa</th>
              <th className="p-3">Valor</th>
              <th className="p-3">Status</th>
              <th className="p-3">Criado em</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-gold/10">
                <td className="p-3 font-mono text-xs">{o.code}</td>
                <td className="p-3">{o.customer.name}</td>
                <td className="p-3">{o.raffle.title}</td>
                <td className="p-3">{formatCents(o.totalPriceCents)}</td>
                <td className="p-3">{STATUS_LABEL[o.status]}</td>
                <td className="p-3 text-xs text-off-white/60">{formatDate(o.createdAt)}</td>
                <td className="whitespace-nowrap p-3">
                  <a href={whatsappLink(o)} target="_blank" rel="noreferrer" className="mr-3 text-emerald-400 underline">
                    WhatsApp
                  </a>
                  {o.status === 'PENDING_PAYMENT' && (
                    <button onClick={() => approve(o.id)} className="text-gold underline">
                      Confirmar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
