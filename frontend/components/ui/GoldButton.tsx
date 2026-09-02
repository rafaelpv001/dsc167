import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'gold' | 'outline' };

export function GoldButton({ variant = 'gold', className = '', ...props }: Props) {
  const base =
    'rounded-full px-6 py-3 font-serif text-sm font-semibold tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50';
  const styles =
    variant === 'gold'
      ? 'bg-gradient-to-b from-[#FFF2A8] via-gold to-bronze text-night-blue shadow-lg hover:brightness-105 active:brightness-95'
      : 'border border-gold text-gold hover:bg-gold/10';

  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
