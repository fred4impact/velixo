import { serverFetch } from '@/lib/api-server';
import { SharedWishlist } from '@/types';

export const wishlistServer = {
  getShared: (token: string) => serverFetch<SharedWishlist>(`/wishlist/shared/${token}`),
};
