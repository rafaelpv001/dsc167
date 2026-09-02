'use client';

import { formatCents } from '../utils/format';
import { GoldButton } from './ui/GoldButton';

interface Props {
  selected: string[];
  unitPriceCents: number;
  onClear: () => void;
  onContinue: () => void;
}

export function SelectionBar({ selected, unitPriceCents, onClear, onContinue }: Props) {
  if (selected.length === 0) return null;
  const total = selected.length * unitPriceCents;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gold/30 bg-night-blue/95 px-4 py-3 backdrop-blur sm:static sm:rounded-xl sm:border">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
        <div className="text-off-white">
          <p className="text-xs text-off-white/70">
            {selected.length} número{selected.length > 1 ? 's' : ''} selecionado{selected.length > 1 ? 's' : ''}
          </p>
          <p className="font-serif text-lg font-semibold text-gold">{formatCents(total)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onClear} className="text-xs text-off-white/60 underline underline-offset-2">
            Limpar seleção
          </button>
          <GoldButton onClick={onContinue}>Continuar compra</GoldButton>
        </div>
      </div>
    </div>
  );
}
