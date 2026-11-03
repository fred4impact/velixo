'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/account', label: 'Profile' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/addresses', label: 'Addresses' },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return <div className="mx-auto max-w-4xl px-4 py-16 text-center">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-black tracking-tight uppercase">My account</h1>
      <div className="mb-8 flex gap-6 border-b border-border text-sm font-semibold tracking-wide uppercase">
        {TABS.map((tab) => {
          const active = tab.href === '/account' ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'border-b-2 pb-4 -mb-px transition-colors',
                active
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      {children}
    </div>
  );
}
