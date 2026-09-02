'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '../../services/api';

const LINKS = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/raffles', label: 'Rifas' },
  { href: '/admin/orders', label: 'Pedidos' },
  { href: '/admin/admins', label: 'Administradores' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await api.post('/api/auth/logout');
    router.replace('/admin/login');
  }

  return (
    <nav className="flex w-full shrink-0 flex-row gap-2 border-b border-gold/20 bg-noble-blue/60 p-3 sm:w-56 sm:flex-col sm:border-b-0 sm:border-r sm:p-4">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={`rounded-md px-3 py-2 text-sm ${
            pathname.startsWith(link.href) ? 'bg-gold/20 text-gold' : 'text-off-white/80 hover:bg-off-white/10'
          }`}
        >
          {link.label}
        </Link>
      ))}
      <button
        onClick={logout}
        className="ml-auto rounded-md px-3 py-2 text-left text-sm text-off-white/60 sm:ml-0 sm:mt-auto"
      >
        Sair
      </button>
    </nav>
  );
}
