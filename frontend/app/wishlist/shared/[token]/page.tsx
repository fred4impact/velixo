import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AddToCartButton } from '@/components/products/add-to-cart-button';
import { wishlistServer } from '@/services/wishlist.server';
import { formatPrice } from '@/lib/format';

interface SharedWishlistPageProps {
  params: Promise<{ token: string }>;
}

export default async function SharedWishlistPage({ params }: SharedWishlistPageProps) {
  const { token } = await params;
  const wishlist = await wishlistServer.getShared(token).catch(() => null);
  if (!wishlist) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-black tracking-tight uppercase">{wishlist.ownerName}&rsquo;s wishlist</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {wishlist.items.length} item{wishlist.items.length === 1 ? '' : 's'}
      </p>

      {wishlist.items.length === 0 ? (
        <p className="mt-10 text-muted-foreground">This wishlist is empty.</p>
      ) : (
        <div className="mt-8 divide-y divide-border border-t border-border">
          {wishlist.items.map((item) => {
            const image = item.product.images[0]?.url;
            const price = Number(item.product.salePrice ?? item.product.regularPrice);
            const inStock = item.product.stockQty > 0;
            return (
              <div key={item.id} className="flex items-center gap-4 py-5">
                <Link
                  href={`/products/${item.product.slug}`}
                  className="relative h-24 w-24 shrink-0 overflow-hidden bg-muted"
                >
                  {image && <Image src={image} alt={item.product.name} fill className="object-cover" />}
                </Link>
                <div className="flex-1">
                  <Link href={`/products/${item.product.slug}`} className="font-medium hover:underline">
                    {item.product.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {formatPrice(price)}{' '}
                    {!inStock && <span className="text-destructive">&middot; Out of stock</span>}
                  </p>
                </div>
                <div className="w-64">
                  <AddToCartButton productId={item.productId} inStock={inStock} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
