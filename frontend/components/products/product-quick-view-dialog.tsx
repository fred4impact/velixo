'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { AddToCartButton } from './add-to-cart-button';
import { WishlistButton } from './wishlist-button';
import { Product } from '@/types';
import { formatPrice } from '@/lib/format';

export function ProductQuickViewDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const image = product.images[0]?.url;
  const onSale = product.salePrice && Number(product.salePrice) < Number(product.regularPrice);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogTitle className="sr-only">{product.name}</DialogTitle>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="relative aspect-square overflow-hidden bg-muted">
            {image ? (
              <Image src={image} alt={product.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No image
              </div>
            )}
            {onSale && (
              <span className="absolute left-0 top-0 bg-destructive px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase text-destructive-foreground">
                Sale
              </span>
            )}
          </div>

          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                {product.brand && (
                  <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                    {product.brand.name}
                  </p>
                )}
                <h2 className="mt-1 text-xl font-bold">{product.name}</h2>
              </div>
              <WishlistButton productId={product.id} className="mt-1 shrink-0" />
            </div>

            <div className="mt-3 flex items-center gap-2">
              {onSale ? (
                <>
                  <span className="text-lg font-bold text-destructive">{formatPrice(product.salePrice!)}</span>
                  <span className="text-muted-foreground line-through">
                    {formatPrice(product.regularPrice)}
                  </span>
                </>
              ) : (
                <span className="text-lg font-bold">{formatPrice(product.regularPrice)}</span>
              )}
            </div>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              {product.shortDescription ?? product.description}
            </p>

            <p className="mt-4 text-sm text-muted-foreground">
              {product.stockQty > 0 ? `${product.stockQty} in stock` : 'Out of stock'}
            </p>

            <div className="mt-6">
              <AddToCartButton productId={product.id} inStock={product.stockQty > 0} />
            </div>

            <Link
              href={`/products/${product.slug}`}
              className="mt-4 block text-sm font-semibold underline-offset-4 hover:underline"
            >
              View full details
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
