import Link from 'next/link';
import { ArrowRight, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/products/product-card';
import { catalogServer } from '@/services/catalog.server';
import { Category, Product } from '@/types';

const TRUST_ITEMS = [
  { icon: Truck, title: 'Free shipping', description: 'On every order, no minimum' },
  { icon: RotateCcw, title: 'Easy returns', description: '30 days to change your mind' },
  { icon: ShieldCheck, title: 'Secure checkout', description: 'Your payment info stays protected' },
];

const CATEGORY_IMAGES: Record<string, string> = {
  footwear: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&h=1100&fit=crop&q=80',
  apparel: 'https://images.unsplash.com/photo-1543076447-215ad9ba6923?w=900&h=1100&fit=crop&q=80',
  accessories: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&h=1100&fit=crop&q=80',
};
const DEFAULT_CATEGORY_IMAGE =
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=900&h=1100&fit=crop&q=80';

export default async function HomePage() {
  const [{ items }, categories] = await Promise.all([
    catalogServer
      .listProducts({ limit: 8, sortBy: 'createdAt', sortOrder: 'desc' })
      .catch(() => ({ items: [] as Product[] })),
    catalogServer.listCategories().catch(() => [] as Category[]),
  ]);

  const topLevelCategories = categories.filter((c) => !c.parentId);

  return (
    <div>
      <section
        className="relative flex min-h-[560px] items-end bg-cover bg-center sm:min-h-[640px]"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1552346154-21d32810aba3?w=1800&h=1200&fit=crop&q=80')",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-16">
          <p className="text-xs font-semibold tracking-[0.3em] text-white/70 uppercase">
            New season
          </p>
          <h1 className="mt-3 max-w-xl text-5xl font-black tracking-tight text-white uppercase sm:text-6xl">
            Shop the essentials.
          </h1>
          <p className="mt-4 max-w-md text-white/80">
            Simple, well-made products — no clutter, no noise.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-8 rounded-none bg-white px-8 font-semibold tracking-wide text-black uppercase hover:bg-white/85"
          >
            <Link href="/products">
              Shop all products
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-10 sm:grid-cols-3">
          {TRUST_ITEMS.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-center gap-3">
              <Icon className="h-6 w-6 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {topLevelCategories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16">
          <h2 className="mb-6 text-xl font-bold tracking-tight uppercase">Shop by category</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {topLevelCategories.map((category) => (
              <Link
                key={category.id}
                href={`/products?categoryId=${category.id}`}
                className="group relative flex aspect-[4/5] items-end overflow-hidden bg-muted"
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-105"
                  style={{
                    backgroundImage: `url('${CATEGORY_IMAGES[category.slug] ?? DEFAULT_CATEGORY_IMAGE}')`,
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-transparent" />
                <span className="relative px-5 py-4 text-lg font-bold tracking-wide text-white uppercase">
                  {category.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-xl font-bold tracking-tight uppercase">New arrivals</h2>
          <Link
            href="/products?sortBy=createdAt&sortOrder=desc"
            className="text-sm font-semibold tracking-wide uppercase underline-offset-4 hover:underline"
          >
            Shop all
          </Link>
        </div>
        {items.length === 0 ? (
          <p className="text-muted-foreground">No products yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
