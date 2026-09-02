'use client';

import { usePathname } from 'next/navigation';
import { AdminSidebar } from '../../components/admin/AdminSidebar';
import { SiteHeader } from '../../components/SiteHeader';
import { useAdmin } from '../../hooks/useAdmin';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/admin/login';
  const { admin, loading } = useAdmin();

  if (isLogin) return <>{children}</>;

  if (loading) {
    return (
      <main className="min-h-screen bg-night-blue text-off-white">
        <SiteHeader />
        <div className="flex items-center justify-center py-16">Carregando...</div>
      </main>
    );
  }

  if (!admin) return null; // useAdmin já redirecionou para /admin/login

  return (
    <div className="min-h-screen bg-night-blue text-off-white">
      <SiteHeader />
      <div className="flex flex-col sm:flex-row">
        <AdminSidebar />
        <div className="flex-1 p-4 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
