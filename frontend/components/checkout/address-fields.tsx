'use client';

import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckoutFormValues } from '@/lib/schemas';

export function AddressFields({ prefix }: { prefix: 'shippingAddress' | 'billingAddress' }) {
  const {
    register,
    formState: { errors },
  } = useFormContext<CheckoutFormValues>();
  const fieldErrors = errors[prefix];

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2">
        <Label htmlFor={`${prefix}.fullName`}>Full name</Label>
        <Input id={`${prefix}.fullName`} {...register(`${prefix}.fullName`)} />
        {fieldErrors?.fullName && (
          <p className="mt-1 text-xs text-destructive">{fieldErrors.fullName.message}</p>
        )}
      </div>
      <div className="col-span-2">
        <Label htmlFor={`${prefix}.line1`}>Address line 1</Label>
        <Input id={`${prefix}.line1`} {...register(`${prefix}.line1`)} />
        {fieldErrors?.line1 && (
          <p className="mt-1 text-xs text-destructive">{fieldErrors.line1.message}</p>
        )}
      </div>
      <div className="col-span-2">
        <Label htmlFor={`${prefix}.line2`}>Address line 2 (optional)</Label>
        <Input id={`${prefix}.line2`} {...register(`${prefix}.line2`)} />
      </div>
      <div>
        <Label htmlFor={`${prefix}.city`}>City</Label>
        <Input id={`${prefix}.city`} {...register(`${prefix}.city`)} />
        {fieldErrors?.city && (
          <p className="mt-1 text-xs text-destructive">{fieldErrors.city.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor={`${prefix}.region`}>State / Region</Label>
        <Input id={`${prefix}.region`} {...register(`${prefix}.region`)} />
      </div>
      <div>
        <Label htmlFor={`${prefix}.postalCode`}>Postal code</Label>
        <Input id={`${prefix}.postalCode`} {...register(`${prefix}.postalCode`)} />
        {fieldErrors?.postalCode && (
          <p className="mt-1 text-xs text-destructive">{fieldErrors.postalCode.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor={`${prefix}.country`}>Country</Label>
        <Input id={`${prefix}.country`} placeholder="US" {...register(`${prefix}.country`)} />
        {fieldErrors?.country && (
          <p className="mt-1 text-xs text-destructive">{fieldErrors.country.message}</p>
        )}
      </div>
      <div className="col-span-2">
        <Label htmlFor={`${prefix}.phone`}>Phone (optional)</Label>
        <Input id={`${prefix}.phone`} {...register(`${prefix}.phone`)} />
      </div>
    </div>
  );
}
