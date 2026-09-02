'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError, API_URL } from '../../../../services/api';
import { GoldButton } from '../../../../components/ui/GoldButton';
import { resolveMediaUrl } from '../../../../utils/format';
import type { RafflePublic } from '../../../../types/raffle';

export default function NewRafflePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    totalNumbers: 100,
    unitPriceCentsReais: 10,
    reservationMinutes: 30,
  });

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const result = await api.upload<{ url: string }>('/api/admin/uploads/raffle-cover', file);
      setCoverImageUrl(result.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao enviar imagem.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const raffle = await api.post<RafflePublic>('/api/admin/raffles', {
        title: form.title,
        description: form.description || undefined,
        coverImageUrl: coverImageUrl ?? undefined,
        totalNumbers: Number(form.totalNumbers),
        unitPriceCents: Math.round(Number(form.unitPriceCentsReais) * 100),
        reservationMinutes: Number(form.reservationMinutes),
      });
      router.push(`/admin/raffles/${raffle.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar rifa.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 font-serif text-2xl font-bold text-gold">Nova rifa</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Título
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="rounded-md border border-off-white/20 bg-transparent px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Descrição
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-md border border-off-white/20 bg-transparent px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Imagem do prêmio (mostrada na página pública da rifa)
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleImageChange}
            className="rounded-md border border-off-white/20 bg-transparent px-3 py-2 text-xs file:mr-3 file:rounded-full file:border-0 file:bg-gold file:px-3 file:py-1 file:text-night-blue"
          />
          {uploading && <span className="text-xs text-off-white/60">Enviando imagem...</span>}
          {coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolveMediaUrl(coverImageUrl, API_URL)}
              alt="Pré-visualização do prêmio"
              className="mt-2 h-40 w-full rounded-lg border border-gold/30 object-cover"
            />
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Quantidade de números
          <input
            type="number"
            required
            min={1}
            value={form.totalNumbers}
            onChange={(e) => setForm({ ...form, totalNumbers: Number(e.target.value) })}
            className="rounded-md border border-off-white/20 bg-transparent px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Valor por número (R$)
          <input
            type="number"
            required
            min={0.01}
            step={0.01}
            value={form.unitPriceCentsReais}
            onChange={(e) => setForm({ ...form, unitPriceCentsReais: Number(e.target.value) })}
            className="rounded-md border border-off-white/20 bg-transparent px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Tempo máximo de reserva (minutos)
          <input
            type="number"
            required
            min={1}
            value={form.reservationMinutes}
            onChange={(e) => setForm({ ...form, reservationMinutes: Number(e.target.value) })}
            className="rounded-md border border-off-white/20 bg-transparent px-3 py-2"
          />
        </label>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <GoldButton type="submit" disabled={loading || uploading}>
          {loading ? 'Criando...' : 'Criar rifa'}
        </GoldButton>
      </form>
    </div>
  );
}
