export type Role = 'CUSTOMER' | 'ADMIN';

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentProvider = 'STRIPE' | 'COD';
export type PaymentStatus = 'PENDING' | 'AUTHORIZED' | 'PAID' | 'FAILED';

export interface User {
  id: string;
  email: string;
  role: Role;
  firstName?: string | null;
  lastName?: string | null;
  emailVerifiedAt?: string | null;
  createdAt: string;
}

export interface Address {
  id: string;
  fullName: string;
  line1: string;
  line2?: string | null;
  city: string;
  region?: string | null;
  postalCode: string;
  country: string;
  phone?: string | null;
  isDefault: boolean;
}

export interface AddressInput {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  children?: Category[];
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
}

export interface ProductImage {
  id: string;
  url: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  regularPrice: string;
  salePrice?: string | null;
  stockQty: number;
  isArchived: boolean;
  categoryId?: string | null;
  brandId?: string | null;
  category?: Category | null;
  brand?: Brand | null;
  images: ProductImage[];
}

export interface PaginatedProducts {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: Product;
}

export interface Cart {
  id: string;
  userId?: string | null;
  guestId?: string | null;
  items: CartItem[];
}

export interface CartTotals {
  subtotal: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
}

export interface CartResponse {
  cart: Cart;
  totals: CartTotals;
}

export interface WishlistItem {
  id: string;
  productId: string;
  product: Product;
}

export interface Wishlist {
  id: string;
  userId: string;
  shareToken: string;
  items: WishlistItem[];
}

export interface SharedWishlist {
  id: string;
  ownerName: string;
  items: WishlistItem[];
}

export interface MoveWishlistItemResponse {
  wishlist: Wishlist;
  cart: Cart;
  totals: CartTotals;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  unitPrice: string;
  quantity: number;
}

export interface Payment {
  id: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  providerRef?: string | null;
  amount: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string | null;
  guestEmail?: string | null;
  status: OrderStatus;
  subtotal: string;
  taxTotal: string;
  shippingTotal: string;
  grandTotal: string;
  shippingFullName: string;
  shippingLine1: string;
  shippingLine2?: string | null;
  shippingCity: string;
  shippingRegion?: string | null;
  shippingPostal: string;
  shippingCountry: string;
  shippingPhone?: string | null;
  billingFullName: string;
  billingLine1: string;
  billingLine2?: string | null;
  billingCity: string;
  billingRegion?: string | null;
  billingPostal: string;
  billingCountry: string;
  items: OrderItem[];
  payment: Payment | null;
  createdAt: string;
  user?: { email: string } | null;
}

export interface CustomerDetail extends User {
  addresses: Address[];
  orders: Order[];
}

export interface CheckoutResponse {
  order: Order;
  payment: { provider: 'COD' } | { provider: 'STRIPE'; clientSecret: string };
}

export interface DashboardLowStockProduct {
  id: string;
  name: string;
  sku: string;
  stockQty: number;
}

export interface DashboardRevenueTrendPoint {
  date: string;
  total: number;
}

export interface DashboardStats {
  pendingOrdersCount: number;
  revenueToday: string;
  revenueThisWeek: string;
  lowStockProducts: DashboardLowStockProduct[];
  outOfStockCount: number;
  recentOrders: Order[];
  revenueTrend: DashboardRevenueTrendPoint[];
  totalCustomersCount: number;
  newCustomersThisWeekCount: number;
}
