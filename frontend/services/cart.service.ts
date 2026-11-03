import { api } from '@/lib/api';
import { CartResponse } from '@/types';

export const cartService = {
  get: () => api.get<CartResponse>('/cart').then((r) => r.data),

  addItem: (productId: string, quantity: number) =>
    api.post<CartResponse>('/cart/items', { productId, quantity }).then((r) => r.data),

  updateItem: (productId: string, quantity: number) =>
    api.put<CartResponse>(`/cart/items/${productId}`, { quantity }).then((r) => r.data),

  removeItem: (productId: string) =>
    api.delete<CartResponse>(`/cart/items/${productId}`).then((r) => r.data),

  clear: () => api.delete('/cart'),
};
