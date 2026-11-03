import { serverFetch } from '@/lib/api-server';
import { Brand, Category, PaginatedProducts, Product } from '@/types';
import { ProductQuery } from './catalog.service';

export const catalogServer = {
  listProducts: (query: ProductQuery = {}) =>
    serverFetch<PaginatedProducts>('/products', query as Record<string, string | number | undefined>),

  getProductBySlug: (slug: string) => serverFetch<Product>(`/products/slug/${slug}`),

  listCategories: () => serverFetch<Category[]>('/categories'),

  listBrands: () => serverFetch<Brand[]>('/brands'),
};
