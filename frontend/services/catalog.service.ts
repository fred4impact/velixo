import { api } from '@/lib/api';
import { Brand, Category, PaginatedProducts, Product } from '@/types';

export interface ProductQuery {
  search?: string;
  categoryId?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'name' | 'price' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export const productsService = {
  list: (query: ProductQuery = {}) =>
    api.get<PaginatedProducts>('/products', { params: query }).then((r) => r.data),

  listForAdmin: (query: ProductQuery = {}) =>
    api.get<PaginatedProducts>('/products/admin', { params: query }).then((r) => r.data),

  getBySlug: (slug: string) => api.get<Product>(`/products/slug/${slug}`).then((r) => r.data),

  getById: (id: string) => api.get<Product>(`/products/${id}`).then((r) => r.data),

  create: (data: Record<string, unknown>) =>
    api.post<Product>('/products', data).then((r) => r.data),

  update: (id: string, data: Record<string, unknown>) =>
    api.patch<Product>(`/products/${id}`, data).then((r) => r.data),

  remove: (id: string) => api.delete(`/products/${id}`),

  uploadImage: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post(`/products/${id}/images`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },

  removeImage: (id: string, imageId: string) => api.delete(`/products/${id}/images/${imageId}`),
};

export const categoriesService = {
  list: () => api.get<Category[]>('/categories').then((r) => r.data),
  create: (data: { name: string; parentId?: string }) =>
    api.post<Category>('/categories', data).then((r) => r.data),
  update: (id: string, data: { name?: string; parentId?: string }) =>
    api.patch<Category>(`/categories/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/categories/${id}`),
};

export const brandsService = {
  list: () => api.get<Brand[]>('/brands').then((r) => r.data),
  create: (data: { name: string; description?: string }) =>
    api.post<Brand>('/brands', data).then((r) => r.data),
  update: (id: string, data: { name?: string; description?: string }) =>
    api.patch<Brand>(`/brands/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/brands/${id}`),
  uploadLogo: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api
      .post<Brand>(`/brands/${id}/logo`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },
};
