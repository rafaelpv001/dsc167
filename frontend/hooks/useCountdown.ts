'use client';

import { useEffect, useState } from 'react';

export function useCountdown(targetIso: string): string {
  const [label, setLabel] = useState('--:--');

  useEffect(() => {
    const target = new Date(targetIso).getTime();
    const tick = () => {
      const diff = Math.max(target - Date.now(), 0);
      const minutes = Math.floor(diff / 60_000);
      const seconds = Math.floor((diff % 60_000) / 1000);
      setLabel(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return label;
}
