import Link from 'next/link';
import { API_URL } from '../services/api';
import type { RafflePublic } from '../types/raffle';
import { formatCents } from '../utils/format';
import { SiteHeader } from '../components/SiteHeader';

async function getActiveRaffles(): Promise<RafflePublic[]> {
  try {
    const res = await fetch(`${API_URL}/api/raffles`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const raffles = await getActiveRaffles();

  return (
    <main className="min-h-screen bg-night-blue text-off-white">
      <SiteHeader />

      <div className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-8">
        <h1 className="font-serif text-3xl font-bold text-gold sm:text-4xl">Rifa Solidária</h1>
        <p className="mt-2 text-sm text-off-white/70">Participe e colabore com nossas ações filantrópicas.</p>
      </div>

      <div className="mx-auto grid max-w-4xl gap-4 px-4 pb-12 sm:grid-cols-2 sm:px-8">
        {raffles.length === 0 && (
          <p className="col-span-full text-center text-sm text-off-white/60">Nenhuma rifa ativa no momento.</p>
        )}
        {raffles.map((raffle) => (
          <Link
            key={raffle.id}
            href={`/rifa/${raffle.slug}`}
            className="rounded-xl border border-gold/30 bg-noble-blue/40 p-5 transition hover:border-gold"
          >
            <h2 className="font-serif text-lg font-semibold text-gold">{raffle.title}</h2>
            <p className="mt-1 text-sm text-off-white/70">{formatCents(raffle.unitPriceCents)} por número</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
