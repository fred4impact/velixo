import Image from 'next/image';
import { notFound } from 'next/navigation';
import { AddToCartButton } from '@/components/products/add-to-cart-button';
import { WishlistButton } from '@/components/products/wishlist-button';
import { catalogServer } from '@/services/catalog.server';
import { formatPrice } from '@/lib/format';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await catalogServer.getProductBySlug(slug).catch(() => null);
  if (!product) notFound();

  const image = product.images[0]?.url;
  const onSale = product.salePrice && Number(product.salePrice) < Number(product.regularPrice);

  return (
    <div className="mx-auto grid max-w-7xl gap-12 px-4 py-10 md:grid-cols-2 md:gap-16">
      <div className="relative aspect-square overflow-hidden bg-muted">
        {image ? (
          <Image src={image} alt={product.name} fill priority className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            No image
          </div>
        )}
        {onSale && (
          <span className="absolute left-0 top-0 bg-destructive px-3 py-1.5 text-xs font-bold tracking-wide uppercase text-destructive-foreground">
            Sale
          </span>
        )}
      </div>

      <div className="md:py-4">
        {product.brand && (
          <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {product.brand.name}
          </p>
        )}
        <div className="mt-1 flex items-start justify-between gap-3">
          <h1 className="text-3xl font-black tracking-tight">{product.name}</h1>
          <WishlistButton productId={product.id} className="mt-2 shrink-0" />
        </div>

        <div className="mt-4 flex items-center gap-3">
          {onSale ? (
            <>
              <span className="text-2xl font-bold text-destructive">
                {formatPrice(product.salePrice!)}
              </span>
              <span className="text-lg text-muted-foreground line-through">
                {formatPrice(product.regularPrice)}
              </span>
            </>
          ) : (
            <span className="text-2xl font-bold">{formatPrice(product.regularPrice)}</span>
          )}
        </div>

        <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
          {product.description ?? product.shortDescription}
        </p>

        <p className="mt-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          SKU: {product.sku} &middot;{' '}
          {product.stockQty > 0 ? `${product.stockQty} in stock` : 'Out of stock'}
        </p>

        <div className="mt-8 max-w-sm">
          <AddToCartButton productId={product.id} inStock={product.stockQty > 0} />
        </div>
      </div>
    </div>
  );
}
