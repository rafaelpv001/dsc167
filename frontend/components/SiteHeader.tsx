'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === '/';
  const isAdminRoute = pathname.startsWith('/admin');

  return (
    <header className="flex items-center gap-3 border-b border-gold/20 px-4 py-4 sm:px-8">
      {!isHome && (
        <button
          onClick={() => router.back()}
          aria-label="Voltar"
          className="rounded-full border border-off-white/20 px-3 py-2 text-sm text-off-white/80 transition hover:border-gold hover:text-gold"
        >
          ← Voltar
        </button>
      )}

      <Link href="/" className="flex flex-1 items-center gap-3">
        <Image
          src="/logo.png"
          alt="A.R.L.M. Domingos da Silva Cunha Nº 167"
          width={48}
          height={48}
          className="rounded-full"
          priority
        />
        <span className="font-serif text-base font-semibold text-gold sm:text-xl">
          A.R.L.M. Domingos da Silva Cunha Nº 167
        </span>
      </Link>

      {!isAdminRoute && (
        <Link
          href="/admin/login"
          className="rounded-full border border-gold px-4 py-2 text-sm font-semibold text-gold transition hover:bg-gold/10"
        >
          Login
        </Link>
      )}
    </header>
  );
}
