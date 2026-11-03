'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Share2, ShoppingBag, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import {
  useMoveWishlistItemToCart,
  useRemoveWishlistItem,
  useWishlist,
} from '@/hooks/use-wishlist';
import { formatPrice } from '@/lib/format';

export default function WishlistPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { data, isLoading } = useWishlist();
  const removeItem = useRemoveWishlistItem();
  const moveToCart = useMoveWishlistItemToCart();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  if (authLoading || !user || isLoading) {
    return <div className="mx-auto max-w-5xl px-4 py-16 text-center">Loading wishlist...</div>;
  }

  const items = data?.items ?? [];

  const share = async () => {
    if (!data) return;
    const url = `${window.location.origin}/wishlist/shared/${data.shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Wishlist link copied to clipboard');
    } catch {
      toast.error('Could not copy link');
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24 text-center">
        <h1 className="text-3xl font-black tracking-tight uppercase">Your wishlist is empty</h1>
        <Button asChild className="mt-8 rounded-none font-semibold tracking-wide uppercase" size="lg">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight uppercase">Your wishlist</h1>
        <Button
          variant="outline"
          className="rounded-none font-semibold tracking-wide uppercase"
          onClick={share}
        >
          <Share2 className="mr-2 h-4 w-4" /> Share
        </Button>
      </div>

      <div className="divide-y divide-border border-t border-border">
        {items.map((item) => {
          const image = item.product.images[0]?.url;
          const price = Number(item.product.salePrice ?? item.product.regularPrice);
          const inStock = item.product.stockQty > 0;
          return (
            <div key={item.id} className="flex items-center gap-4 py-5">
              <Link href={`/products/${item.product.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden bg-muted">
                {image && <Image src={image} alt={item.product.name} fill className="object-cover" />}
              </Link>
              <div className="flex-1">
                <Link href={`/products/${item.product.slug}`} className="font-medium hover:underline">
                  {item.product.name}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {formatPrice(price)} {!inStock && <span className="text-destructive">&middot; Out of stock</span>}
                </p>
              </div>
              <Button
                variant="outline"
                className="rounded-none font-semibold tracking-wide uppercase"
                disabled={!inStock || moveToCart.isPending}
                onClick={() => moveToCart.mutate(item.productId)}
              >
                <ShoppingBag className="mr-2 h-4 w-4" /> Move to cart
              </Button>
              <Button variant="ghost" size="icon" onClick={() => removeItem.mutate(item.productId)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
