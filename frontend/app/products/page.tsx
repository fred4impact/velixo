import { ProductCard } from '@/components/products/product-card';
import { catalogServer } from '@/services/catalog.server';
import { ProductFilters } from '@/components/products/product-filters';

interface ProductsPageProps {
  searchParams: Promise<{
    search?: string;
    categoryId?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const [{ items, total, totalPages, page }, categories] = await Promise.all([
    catalogServer.listProducts({
      search: params.search,
      categoryId: params.categoryId,
      sortBy: (params.sortBy as 'name' | 'price' | 'createdAt') ?? undefined,
      sortOrder: (params.sortOrder as 'asc' | 'desc') ?? undefined,
      page: params.page ? Number(params.page) : 1,
      limit: 12,
    }),
    catalogServer.listCategories().catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-1 text-3xl font-black tracking-tight uppercase">All products</h1>
      <p className="mb-6 text-sm text-muted-foreground">{total} products</p>

      <ProductFilters categories={categories} />

      {items.length === 0 ? (
        <p className="text-muted-foreground">No products match your filters.</p>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <p className="mt-10 text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Page {page} of {totalPages}
        </p>
      )}
    </div>
  );
}
