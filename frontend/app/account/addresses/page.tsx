'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { usersService } from '@/services/users.service';
import { addressSchema } from '@/lib/schemas';
import { z } from 'zod';

type AddressForm = z.infer<typeof addressSchema>;

export default function AddressesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: addresses, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: usersService.listAddresses,
  });

  const { register, handleSubmit, reset } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: { country: 'US' },
  });

  const createMutation = useMutation({
    mutationFn: usersService.createAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Address added');
      setOpen(false);
      reset();
    },
    onError: () => toast.error('Could not add address'),
  });

  const deleteMutation = useMutation({
    mutationFn: usersService.deleteAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Address removed');
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-none font-semibold tracking-wide uppercase">Add address</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New address</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={handleSubmit((values) => createMutation.mutate(values))}
              className="space-y-3"
            >
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" {...register('fullName')} />
              </div>
              <div>
                <Label htmlFor="line1">Address line 1</Label>
                <Input id="line1" {...register('line1')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" {...register('city')} />
                </div>
                <div>
                  <Label htmlFor="postalCode">Postal code</Label>
                  <Input id="postalCode" {...register('postalCode')} />
                </div>
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input id="country" {...register('country')} />
              </div>
              <Button
                type="submit"
                className="w-full rounded-none font-semibold tracking-wide uppercase"
                disabled={createMutation.isPending}
              >
                Save address
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : !addresses || addresses.length === 0 ? (
        <p className="text-muted-foreground">No saved addresses yet.</p>
      ) : (
        <div className="space-y-3">
          {addresses.map((address) => (
            <div key={address.id} className="flex items-start justify-between border border-border p-4">
              <div className="text-sm">
                <p className="font-medium">{address.fullName}</p>
                <p>{address.line1}</p>
                <p>
                  {address.city}, {address.postalCode}, {address.country}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate(address.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
