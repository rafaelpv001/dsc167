'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCountdown } from '../../../hooks/useCountdown';
import { api, API_URL } from '../../../services/api';
import { formatCents } from '../../../utils/format';
import { GoldButton } from '../../../components/ui/GoldButton';
import { SiteHeader } from '../../../components/SiteHeader';
import type { OrderPublic } from '../../../types/raffle';

export function OrderPageClient({ initialOrder }: { initialOrder: OrderPublic }) {
  const [order, setOrder] = useState(initialOrder);
  const [copied, setCopied] = useState(false);
  const countdown = useCountdown(order.payment?.expiresAt ?? order.expiresAt);

  // Realtime: qualquer confirmação de pagamento nesta rifa dispara uma releitura
  // do pedido (o backend é a fonte de verdade — o SSE é só o gatilho).
  useEffect(() => {
    if (order.status !== 'PENDING_PAYMENT') return;
    const source = new EventSource(`${API_URL}/api/raffles/${order.raffle.slug}/events`);
    source.onmessage = async (event) => {
      const parsed = JSON.parse(event.data) as { type: string };
      if (parsed.type === 'PAYMENT_CONFIRMED') {
        const fresh = await api.get<OrderPublic>(`/api/orders/${order.publicToken}`);
        setOrder(fresh);
      }
    };
    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.status]);

  async function copyPixCode() {
    if (!order.payment?.pixCopyPaste) return;
    await navigator.clipboard.writeText(order.payment.pixCopyPaste);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (order.status === 'PAID') {
    return (
      <main className="min-h-screen bg-night-blue text-off-white">
        <SiteHeader />
        <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
          <h1 className="font-serif text-2xl font-bold text-gold">Pagamento confirmado</h1>
          <p className="text-sm text-off-white/70">Pedido: {order.code}</p>
          <p className="font-mono text-sm">{order.numbers.map((n) => n.number).join(', ')}</p>
          <p className="font-serif text-xl font-semibold text-gold">{formatCents(order.totalPriceCents)}</p>
          <p className="max-w-sm text-sm text-off-white/80">
            Seu pagamento foi confirmado e seus números estão garantidos.
          </p>
          <Link href={`/rifa/${order.raffle.slug}`}>
            <GoldButton>Voltar para campanha</GoldButton>
          </Link>
        </div>
      </main>
    );
  }

  if (order.status !== 'PENDING_PAYMENT') {
    return (
      <main className="min-h-screen bg-night-blue text-off-white">
        <SiteHeader />
        <div className="flex items-center justify-center px-4 py-16 text-center">
          <p>Este pedido não está mais aguardando pagamento (status: {order.status}).</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-night-blue text-off-white">
      <SiteHeader />
      <div className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-10">
        <h1 className="font-serif text-xl font-bold text-gold">Aguardando pagamento</h1>
        <p className="text-sm text-off-white/70">
          Sua reserva expira em <span className="font-mono text-gold">{countdown}</span>
        </p>

        <div className="w-full rounded-xl border border-gold/30 bg-noble-blue/40 p-6">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Row label="Código" value={order.code} />
            <Row label="Rifa" value={order.raffle.title} />
            <Row label="Quantidade" value={String(order.quantity)} />
            <Row label="Valor unitário" value={formatCents(order.unitPriceCents)} />
            <Row label="Total" value={formatCents(order.totalPriceCents)} />
          </dl>
          <p className="mt-3 font-mono text-xs text-off-white/70">
            {order.numbers.map((n) => n.number).join(' ')}
          </p>
        </div>

        {order.payment?.pixQrCodeImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={order.payment.pixQrCodeImage} alt="QR Code PIX" className="h-56 w-56 rounded-lg bg-white p-2" />
        )}

        {order.payment?.pixCopyPaste && (
          <div className="w-full">
            <p className="mb-1 text-xs text-off-white/60">PIX Copia e Cola</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={order.payment.pixCopyPaste}
                className="flex-1 truncate rounded-md border border-off-white/20 bg-transparent px-3 py-2 text-xs"
              />
              <GoldButton type="button" onClick={copyPixCode}>
                {copied ? 'Copiado!' : 'Copiar'}
              </GoldButton>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-off-white/60">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
