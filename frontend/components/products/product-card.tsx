'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { ProductQuickViewDialog } from './product-quick-view-dialog';
import { WishlistButton } from './wishlist-button';
import { Product } from '@/types';
import { formatPrice } from '@/lib/format';

export function ProductCard({ product }: { product: Product }) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const image = product.images[0]?.url;
  const onSale = product.salePrice && Number(product.salePrice) < Number(product.regularPrice);

  return (
    <>
      <Link href={`/products/${product.slug}`} className="group block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {image ? (
            <Image
              src={image}
              alt={product.name}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
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

          <WishlistButton
            productId={product.id}
            className="absolute right-2 top-2 h-8 w-8 rounded-full bg-background/90 shadow-sm"
          />

          <button
            type="button"
            className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center gap-2 bg-background/95 py-2.5 text-xs font-semibold tracking-wide uppercase transition-transform duration-300 ease-out group-hover:translate-y-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setQuickViewOpen(true);
            }}
          >
            <Eye className="h-3.5 w-3.5" />
            Quick view
          </button>
        </div>

        <div className="mt-3 space-y-0.5">
          {product.brand && (
            <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {product.brand.name}
            </p>
          )}
          <p className="line-clamp-1 text-sm font-medium">{product.name}</p>
          {onSale ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-destructive">
                {formatPrice(product.salePrice!)}
              </span>
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.regularPrice)}
              </span>
            </div>
          ) : (
            <span className="text-sm font-bold">{formatPrice(product.regularPrice)}</span>
          )}
        </div>
      </Link>

      <ProductQuickViewDialog product={product} open={quickViewOpen} onOpenChange={setQuickViewOpen} />
    </>
  );
}
