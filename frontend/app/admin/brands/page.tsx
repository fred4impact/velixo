'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BrandFormDialog } from '@/components/admin/brand-form-dialog';
import { brandsService } from '@/services/catalog.service';
import { Brand } from '@/types';

export default function AdminBrandsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  const { data: brands, isLoading } = useQuery({
    queryKey: ['admin-brands'],
    queryFn: brandsService.list,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => brandsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success('Brand deleted');
    },
    onError: () => toast.error('Could not delete brand — remove it from products first'),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight uppercase">Brands</h1>
        <Button
          className="rounded-none font-semibold tracking-wide uppercase"
          onClick={() => {
            setEditingBrand(null);
            setDialogOpen(true);
          }}
        >
          New brand
        </Button>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : !brands || brands.length === 0 ? (
        <p className="text-muted-foreground">No brands yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Logo</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.map((brand) => (
              <TableRow key={brand.id}>
                <TableCell>
                  {brand.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={brand.logoUrl} alt="" className="h-10 w-10 object-contain" />
                  ) : (
                    <div className="h-10 w-10 bg-muted" />
                  )}
                </TableCell>
                <TableCell className="font-medium">{brand.name}</TableCell>
                <TableCell className="text-muted-foreground">{brand.slug}</TableCell>
                <TableCell className="max-w-xs truncate text-muted-foreground">
                  {brand.description ?? '—'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingBrand(brand);
                        setDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete "${brand.name}"?`)) deleteMutation.mutate(brand.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <BrandFormDialog open={dialogOpen} onOpenChange={setDialogOpen} brand={editingBrand} />
    </div>
  );
}
