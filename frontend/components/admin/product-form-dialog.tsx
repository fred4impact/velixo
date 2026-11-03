'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { productSchema, ProductFormInput } from '@/lib/schemas';
import { productsService, categoriesService, brandsService } from '@/services/catalog.service';
import { Product } from '@/types';

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesService.list });
  const { data: brands } = useQuery({ queryKey: ['brands'], queryFn: brandsService.list });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormInput>({ resolver: zodResolver(productSchema) });

  useEffect(() => {
    if (product) {
      reset({
        sku: product.sku,
        name: product.name,
        description: product.description ?? '',
        shortDescription: product.shortDescription ?? '',
        regularPrice: Number(product.regularPrice),
        salePrice: product.salePrice ? Number(product.salePrice) : undefined,
        stockQty: product.stockQty,
        categoryId: product.categoryId ?? undefined,
        brandId: product.brandId ?? undefined,
      });
    } else {
      reset({
        sku: '',
        name: '',
        description: '',
        shortDescription: '',
        regularPrice: 0,
        salePrice: undefined,
        stockQty: 0,
        categoryId: undefined,
        brandId: undefined,
      });
    }
  }, [product, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: ProductFormInput) => {
      const parsed = productSchema.parse(values);
      const payload = {
        ...parsed,
        salePrice: parsed.salePrice && !Number.isNaN(parsed.salePrice) ? parsed.salePrice : undefined,
      };
      return product ? productsService.update(product.id, payload) : productsService.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success(product ? 'Product updated' : 'Product created');
      onOpenChange(false);
    },
    onError: () => toast.error('Could not save product'),
  });

  const uploadImageMutation = useMutation({
    mutationFn: (file: File) => productsService.uploadImage(product!.id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Image uploaded');
    },
    onError: () => toast.error('Could not upload image'),
    onSettled: () => setUploading(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit product' : 'New product'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          className="space-y-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register('sku')} />
              {errors.sku && <p className="mt-1 text-xs text-destructive">{errors.sku.message}</p>}
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="shortDescription">Short description</Label>
            <Input id="shortDescription" {...register('shortDescription')} />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register('description')} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="regularPrice">Price</Label>
              <Input id="regularPrice" type="number" step="0.01" {...register('regularPrice')} />
              {errors.regularPrice && (
                <p className="mt-1 text-xs text-destructive">{errors.regularPrice.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="salePrice">Sale price</Label>
              <Input id="salePrice" type="number" step="0.01" {...register('salePrice')} />
            </div>
            <div>
              <Label htmlFor="stockQty">Stock</Label>
              <Input id="stockQty" type="number" {...register('stockQty')} />
              {errors.stockQty && (
                <p className="mt-1 text-xs text-destructive">{errors.stockQty.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select
                value={watch('categoryId') ?? 'none'}
                onValueChange={(v) => setValue('categoryId', v === 'none' ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Brand</Label>
              <Select
                value={watch('brandId') ?? 'none'}
                onValueChange={(v) => setValue('brandId', v === 'none' ? undefined : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {brands?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {product && (
            <div>
              <Label>Images</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.images.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={img.id} src={img.url} alt="" className="h-16 w-16 object-cover" />
                ))}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="mt-2 text-sm"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploading(true);
                    uploadImageMutation.mutate(file);
                  }
                }}
                disabled={uploading}
              />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : 'Save product'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
