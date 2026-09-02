import { API_URL } from '../../../services/api';
import type { OrderPublic } from '../../../types/raffle';
import { OrderPageClient } from './OrderPageClient';

async function getOrder(token: string): Promise<OrderPublic | null> {
  const res = await fetch(`${API_URL}/api/orders/${token}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = await getOrder(token);

  if (!order) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-night-blue text-off-white">
        <p>Pedido não encontrado.</p>
      </main>
    );
  }

  return <OrderPageClient initialOrder={order} />;
}
