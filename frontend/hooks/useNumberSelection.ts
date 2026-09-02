'use client';

import { useCallback, useState } from 'react';

export function useNumberSelection() {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = useCallback((number: string) => {
    setSelected((prev) => (prev.includes(number) ? prev.filter((n) => n !== number) : [...prev, number]));
  }, []);

  const clear = useCallback(() => setSelected([]), []);

  return { selected, toggle, clear };
}
