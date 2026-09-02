'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '../../../services/api';
import { GoldButton } from '../../../components/ui/GoldButton';
import { SiteHeader } from '../../../components/SiteHeader';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/api/auth/login', { email, password });
      router.push('/admin/raffles');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-night-blue text-off-white">
      <SiteHeader />
      <div className="flex items-center justify-center px-4 py-16">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-gold/30 bg-noble-blue/40 p-8"
      >
        <h1 className="text-center font-serif text-xl font-bold text-gold">Área Administrativa</h1>

        <label className="flex flex-col gap-1 text-sm">
          E-mail
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-off-white/20 bg-transparent px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Senha
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-off-white/20 bg-transparent px-3 py-2"
          />
        </label>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <GoldButton type="submit" disabled={loading} className="mt-2">
          {loading ? 'Entrando...' : 'Entrar'}
        </GoldButton>
      </form>
      </div>
    </main>
  );
}
