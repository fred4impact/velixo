'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CategoryFormDialog } from '@/components/admin/category-form-dialog';
import { categoriesService } from '@/services/catalog.service';
import { Category } from '@/types';

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: categoriesService.list,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoriesService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted');
    },
    onError: () =>
      toast.error('Could not delete category — remove its subcategories or products first'),
  });

  const nameById = new Map((categories ?? []).map((c) => [c.id, c.name]));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight uppercase">Categories</h1>
        <Button
          className="rounded-none font-semibold tracking-wide uppercase"
          onClick={() => {
            setEditingCategory(null);
            setDialogOpen(true);
          }}
        >
          New category
        </Button>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : !categories || categories.length === 0 ? (
        <p className="text-muted-foreground">No categories yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                <TableCell className="text-muted-foreground">
                  {category.parentId ? (nameById.get(category.parentId) ?? '—') : '—'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingCategory(category);
                        setDialogOpen(true);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete "${category.name}"?`)) deleteMutation.mutate(category.id);
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

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={editingCategory}
        categories={categories ?? []}
      />
    </div>
  );
}
