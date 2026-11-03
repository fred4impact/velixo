'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ProductsTable } from '@/components/admin/products-table';
import { ProductFormDialog } from '@/components/admin/product-form-dialog';
import { productsService } from '@/services/catalog.service';
import { Product } from '@/types';

export default function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => productsService.listForAdmin({ limit: 100 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Product deleted');
    },
    onError: () => toast.error('Could not delete product'),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight uppercase">Products</h1>
        <Button
          className="rounded-none font-semibold tracking-wide uppercase"
          onClick={() => {
            setEditingProduct(null);
            setDialogOpen(true);
          }}
        >
          New product
        </Button>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <ProductsTable
          products={data?.items ?? []}
          onEdit={(product) => {
            setEditingProduct(product);
            setDialogOpen(true);
          }}
          onDelete={(product) => {
            if (confirm(`Delete "${product.name}"?`)) deleteMutation.mutate(product.id);
          }}
        />
      )}

      <ProductFormDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editingProduct} />
    </div>
  );
}
