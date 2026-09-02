'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '../services/api';

export interface Admin {
  id: string;
  name: string;
  email: string;
}

/** Garante sessão admin válida; redireciona para /admin/login se não autenticado. */
export function useAdmin() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    api
      .get<{ admin: Admin }>('/api/auth/me')
      .then((res) => setAdmin(res.admin))
      .catch((err) => {
        if (err instanceof ApiError) router.replace('/admin/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  return { admin, loading };
}
