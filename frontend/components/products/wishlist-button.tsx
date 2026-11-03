'use client';

import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useAddWishlistItem, useRemoveWishlistItem, useWishlist } from '@/hooks/use-wishlist';
import { cn } from '@/lib/utils';

export function WishlistButton({ productId, className }: { productId: string; className?: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const { data: wishlist } = useWishlist();
  const addItem = useAddWishlistItem();
  const removeItem = useRemoveWishlistItem();

  const inWishlist = !!wishlist?.items.some((item) => item.productId === productId);
  const pending = addItem.isPending || removeItem.isPending;

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push('/login');
      return;
    }
    if (inWishlist) {
      removeItem.mutate(productId);
    } else {
      addItem.mutate(productId);
    }
  };

  return (
    <button
      type="button"
      aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={inWishlist}
      onClick={toggle}
      disabled={pending}
      className={cn('flex items-center justify-center transition-colors disabled:opacity-60', className)}
    >
      <Heart className={cn('h-5 w-5', inWishlist ? 'fill-destructive text-destructive' : 'text-foreground')} />
    </button>
  );
}
