'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut, ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Logo } from '@/components/layout/logo';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/brands', label: 'Brands' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/customers', label: 'Customers' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) router.push('/');
  }, [isLoading, user, router]);

  if (isLoading || !user || user.role !== 'ADMIN') {
    return <div className="mx-auto max-w-6xl px-4 py-16 text-center">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col bg-foreground text-background">
        <div className="border-b border-background/15 px-5 py-6">
          <Logo className="text-lg" />
          <p className="mt-0.5 text-[11px] font-semibold tracking-[0.2em] text-background/50 uppercase">
            Admin
          </p>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active = item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'block px-3 py-2 text-sm font-semibold tracking-wide uppercase transition-colors',
                  active
                    ? 'bg-background text-foreground'
                    : 'text-background/70 hover:bg-background/10 hover:text-background',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-0.5 border-t border-background/15 px-3 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-sm font-semibold tracking-wide text-background/70 uppercase transition-colors hover:bg-background/10 hover:text-background"
          >
            <ExternalLink className="h-4 w-4" />
            View store
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold tracking-wide text-background/70 uppercase transition-colors hover:bg-background/10 hover:text-background"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 bg-muted/30 px-8 py-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </div>
    </div>
  );
}
