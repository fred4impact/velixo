import Link from 'next/link';
import { Logo } from '@/components/layout/logo';

const FOOTER_COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Shop',
    links: [
      { label: 'New arrivals', href: '/products?sortBy=createdAt&sortOrder=desc' },
      { label: 'All products', href: '/products' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Track my order', href: '/account/orders' },
      { label: 'Returns', href: '/account/orders' },
      { label: 'Contact us', href: '/' },
    ],
  },
  {
    title: 'About',
    links: [
      { label: 'Our story', href: '/' },
      { label: 'Careers', href: '/' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-auto bg-foreground text-background">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo className="text-lg" />
          <p className="mt-3 max-w-xs text-sm text-background/70">
            Simple, well-made products — no clutter, no noise.
          </p>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="text-xs font-semibold tracking-[0.15em] uppercase text-background/50">
              {column.title}
            </p>
            <ul className="mt-4 space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-background/80 transition-colors hover:text-background"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-background/15">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-background/60 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Velixo. All rights reserved.</p>
          <p className="tracking-wide uppercase">Secure checkout &middot; Easy returns</p>
        </div>
      </div>
    </footer>
  );
}
