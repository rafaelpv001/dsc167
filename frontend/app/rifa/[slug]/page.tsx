import { API_URL } from '../../../services/api';
import type { RafflePublic } from '../../../types/raffle';
import { RafflePageClient } from './RafflePageClient';

async function getRaffle(slug: string): Promise<RafflePublic | null> {
  const res = await fetch(`${API_URL}/api/raffles/${slug}`, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export default async function RafflePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const raffle = await getRaffle(slug);

  if (!raffle) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-night-blue text-off-white">
        <p>Rifa não encontrada.</p>
      </main>
    );
  }

  return <RafflePageClient raffle={raffle} />;
}
