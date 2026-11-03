'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { brandSchema, BrandFormValues } from '@/lib/schemas';
import { brandsService } from '@/services/catalog.service';
import { Brand } from '@/types';

export function BrandFormDialog({
  open,
  onOpenChange,
  brand,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: Brand | null;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BrandFormValues>({ resolver: zodResolver(brandSchema) });

  useEffect(() => {
    if (brand) {
      reset({ name: brand.name, description: brand.description ?? '' });
    } else {
      reset({ name: '', description: '' });
    }
  }, [brand, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: BrandFormValues) =>
      brand ? brandsService.update(brand.id, values) : brandsService.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success(brand ? 'Brand updated' : 'Brand created');
      onOpenChange(false);
    },
    onError: () => toast.error('Could not save brand'),
  });

  const uploadLogoMutation = useMutation({
    mutationFn: (file: File) => brandsService.uploadLogo(brand!.id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-brands'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success('Logo uploaded');
    },
    onError: () => toast.error('Could not upload logo'),
    onSettled: () => setUploading(false),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{brand ? 'Edit brand' : 'New brand'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => saveMutation.mutate(values))} className="space-y-3">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register('description')} />
          </div>

          {brand && (
            <div>
              <Label>Logo</Label>
              <div className="mt-2 flex items-center gap-3">
                {brand.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brand.logoUrl} alt="" className="h-16 w-16 object-contain" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center bg-muted text-xs text-muted-foreground">
                    None
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="text-sm"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploading(true);
                      uploadLogoMutation.mutate(file);
                    }
                  }}
                  disabled={uploading}
                />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? 'Saving...' : 'Save brand'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
