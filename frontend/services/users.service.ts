import { api } from '@/lib/api';
import { Address, AddressInput, CustomerDetail, User } from '@/types';

export const usersService = {
  getProfile: () => api.get<User>('/users/me').then((r) => r.data),

  updateProfile: (data: { firstName?: string; lastName?: string }) =>
    api.patch<User>('/users/me', data).then((r) => r.data),

  listAddresses: () => api.get<Address[]>('/users/me/addresses').then((r) => r.data),

  createAddress: (data: AddressInput) =>
    api.post<Address>('/users/me/addresses', data).then((r) => r.data),

  updateAddress: (id: string, data: Partial<AddressInput>) =>
    api.patch<Address>(`/users/me/addresses/${id}`, data).then((r) => r.data),

  deleteAddress: (id: string) => api.delete(`/users/me/addresses/${id}`),

  listCustomers: () => api.get<User[]>('/users').then((r) => r.data),

  getCustomerDetail: (id: string) => api.get<CustomerDetail>(`/users/${id}`).then((r) => r.data),
};
