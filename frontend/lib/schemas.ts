import { z } from 'zod';

export const addressSchema = z.object({
  fullName: z.string().min(1, 'Required'),
  line1: z.string().min(1, 'Required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'Required'),
  region: z.string().optional(),
  postalCode: z.string().min(1, 'Required'),
  country: z.string().min(1, 'Required'),
  phone: z.string().optional(),
});

export const checkoutSchema = z.object({
  guestEmail: z.union([z.string().email('Invalid email'), z.literal('')]).optional(),
  shippingAddress: addressSchema,
  billingSameAsShipping: z.boolean(),
  billingAddress: addressSchema.optional(),
  paymentMethod: z.enum(['COD', 'STRIPE']),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export const productSchema = z.object({
  sku: z.string().min(1, 'Required'),
  name: z.string().min(1, 'Required'),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  regularPrice: z.coerce.number().min(0, 'Must be 0 or more'),
  salePrice: z.union([z.coerce.number().min(0), z.nan()]).optional(),
  stockQty: z.coerce.number().int().min(0, 'Must be 0 or more'),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;
export type ProductFormInput = z.input<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().min(1, 'Required'),
  parentId: z.string().optional(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

export const brandSchema = z.object({
  name: z.string().min(1, 'Required'),
  description: z.string().optional(),
});

export type BrandFormValues = z.infer<typeof brandSchema>;

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Required'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});
