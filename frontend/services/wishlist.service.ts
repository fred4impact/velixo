import { api } from '@/lib/api';
import { MoveWishlistItemResponse, SharedWishlist, Wishlist } from '@/types';

export const wishlistService = {
  get: () => api.get<Wishlist>('/wishlist').then((r) => r.data),

  addItem: (productId: string) =>
    api.post<Wishlist>('/wishlist/items', { productId }).then((r) => r.data),

  removeItem: (productId: string) =>
    api.delete<Wishlist>(`/wishlist/items/${productId}`).then((r) => r.data),

  moveToCart: (productId: string) =>
    api
      .post<MoveWishlistItemResponse>(`/wishlist/items/${productId}/move-to-cart`)
      .then((r) => r.data),

  getShared: (token: string) =>
    api.get<SharedWishlist>(`/wishlist/shared/${token}`).then((r) => r.data),
};
