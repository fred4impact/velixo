'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { categorySchema, CategoryFormValues } from '@/lib/schemas';
import { categoriesService } from '@/services/catalog.service';
import { Category } from '@/types';

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  categories: Category[];
}) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CategoryFormValues>({ resolver: zodResolver(categorySchema) });

  useEffect(() => {
    if (category) {
      reset({ name: category.name, parentId: category.parentId ?? undefined });
    } else {
      reset({ name: '', parentId: undefined });
    }
  }, [category, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: CategoryFormValues) =>
      category ? categoriesService.update(category.id, values) : categoriesService.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success(category ? 'Category updated' : 'Category created');
      onOpenChange(false);
    },
    onError: () => toast.error('Could not save category'),
  });

  // A category can't be its own parent, nor a descendant of itself.
  const parentOptions = categories.filter((c) => c.id !== category?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? 'Edit category' : 'New category'}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) => saveMutation.mutate(values))}
          className="space-y-3"
        >
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div>
            <Label>Parent category</Label>
            <Select
              value={watch('parentId') ?? 'none'}
              onValueChange={(v) => setValue('parentId', v === 'none' ? undefined : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (top-level)</SelectItem>
                {parentOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : 'Save category'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
