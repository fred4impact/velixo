import { api } from '@/lib/api';
import { AddressInput, CheckoutResponse, Order, OrderStatus, PaymentProvider } from '@/types';

export interface CheckoutPayload {
  guestEmail?: string;
  shippingAddress?: AddressInput;
  shippingAddressId?: string;
  billingAddress?: AddressInput;
  billingAddressId?: string;
  paymentMethod: PaymentProvider;
}

export const checkoutService = {
  checkout: (data: CheckoutPayload) =>
    api.post<CheckoutResponse>('/checkout', data).then((r) => r.data),
};

export const ordersService = {
  listMine: () => api.get<Order[]>('/orders/me').then((r) => r.data),

  listForAdmin: () => api.get<Order[]>('/orders').then((r) => r.data),

  getById: (id: string) => api.get<Order>(`/orders/${id}`).then((r) => r.data),

  cancel: (id: string) => api.post<Order>(`/orders/${id}/cancel`).then((r) => r.data),

  updateStatus: (id: string, status: OrderStatus) =>
    api.patch<Order>(`/orders/${id}/status`, { status }).then((r) => r.data),
};
