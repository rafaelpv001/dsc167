'use client';

import { useState } from 'react';
import { formatCents } from '../utils/format';
import { GoldButton } from './ui/GoldButton';

interface Props {
  selected: string[];
  unitPriceCents: number;
  onSubmit: (data: { customerName: string; customerPhone: string }) => Promise<void>;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
}

export function CustomerForm({ selected, unitPriceCents, onSubmit, onBack, submitting, error }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const total = selected.length * unitPriceCents;

  return (
    <form
      className="mx-auto flex max-w-lg flex-col gap-4 rounded-xl border border-gold/30 bg-night-blue/60 p-6 text-off-white"
      onSubmit={(e) => {
        e.preventDefault();
        if (!confirmed) return;
        onSubmit({ customerName: name, customerPhone: phone });
      }}
    >
      <div>
        <p className="text-xs text-off-white/70">Números selecionados</p>
        <p className="font-mono text-sm">{selected.join(', ')}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-off-white/60">Quantidade</p>
          <p className="font-semibold">{selected.length}</p>
        </div>
        <div>
          <p className="text-off-white/60">Total</p>
          <p className="font-serif font-semibold text-gold">{formatCents(total)}</p>
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Nome completo
        <input
          required
          minLength={3}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-off-white/20 bg-transparent px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Telefone / WhatsApp (com DDD)
        <input
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(11) 91234-5678"
          className="rounded-md border border-off-white/20 bg-transparent px-3 py-2"
        />
      </label>

      <label className="flex items-start gap-2 text-xs text-off-white/80">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1" />
        Confirmo que os dados informados estão corretos.
      </label>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      <div className="flex justify-between gap-3">
        <button type="button" onClick={onBack} className="text-sm text-off-white/60 underline">
          Voltar
        </button>
        <GoldButton type="submit" disabled={!confirmed || submitting}>
          {submitting ? 'Reservando...' : 'Confirmar reserva'}
        </GoldButton>
      </div>
    </form>
  );
}
