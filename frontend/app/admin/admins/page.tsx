'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '../../../services/api';
import { formatDate } from '../../../utils/format';
import { GoldButton } from '../../../components/ui/GoldButton';
import type { AdminUserItem } from '../../../types/admin-user';
import { useAdmin } from '../../../hooks/useAdmin';

export default function AdminAdminsPage() {
  const { admin: currentAdmin } = useAdmin();
  const [admins, setAdmins] = useState<AdminUserItem[]>([]);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const list = await api.get<AdminUserItem[]>('/api/admin/admins');
    setAdmins(list);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/api/admin/admins', form);
      setForm({ name: '', email: '', password: '' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar administrador.');
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(item: AdminUserItem) {
    await api.post(`/api/admin/admins/${item.id}/${item.active ? 'deactivate' : 'activate'}`);
    await load();
  }

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 font-serif text-2xl font-bold text-gold">Administradores</h1>

      <form onSubmit={handleSubmit} className="mb-8 flex flex-col gap-4 rounded-xl border border-gold/20 bg-noble-blue/40 p-6">
        <h2 className="font-serif text-lg font-semibold text-gold">Novo membro</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            Nome
            <input
              required
              minLength={3}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-md border border-off-white/20 bg-transparent px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            E-mail
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-md border border-off-white/20 bg-transparent px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Senha
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="rounded-md border border-off-white/20 bg-transparent px-3 py-2"
            />
          </label>
        </div>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <GoldButton type="submit" disabled={loading} className="self-start">
          {loading ? 'Criando...' : 'Criar administrador'}
        </GoldButton>
      </form>

      <div className="overflow-x-auto rounded-xl border border-gold/20">
        <table className="w-full text-left text-sm">
          <thead className="bg-noble-blue/60 text-off-white/70">
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">E-mail</th>
              <th className="p-3">Status</th>
              <th className="p-3">Criado em</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {admins.map((item) => (
              <tr key={item.id} className="border-t border-gold/10">
                <td className="p-3">{item.name}</td>
                <td className="p-3">{item.email}</td>
                <td className="p-3">{item.active ? 'Ativo' : 'Inativo'}</td>
                <td className="p-3 text-xs text-off-white/60">{formatDate(item.createdAt)}</td>
                <td className="p-3">
                  {item.id !== currentAdmin?.id && (
                    <button onClick={() => toggleActive(item)} className="text-gold underline">
                      {item.active ? 'Desativar' : 'Ativar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
