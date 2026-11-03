'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AddressFields } from '@/components/checkout/address-fields';
import { StripePaymentForm } from '@/components/checkout/stripe-payment-form';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/lib/auth-context';
import { checkoutSchema, CheckoutFormValues } from '@/lib/schemas';
import { checkoutService } from '@/services/orders.service';
import { formatPrice } from '@/lib/format';

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: cart } = useCart();
  const queryClient = useQueryClient();
  const [stripeSecret, setStripeSecret] = useState<string | null>(null);
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      guestEmail: '',
      shippingAddress: { fullName: '', line1: '', city: '', postalCode: '', country: 'US' },
      billingSameAsShipping: true,
      paymentMethod: 'COD',
    },
  });

  const billingSame = form.watch('billingSameAsShipping');
  const paymentMethod = form.watch('paymentMethod');

  const onSubmit = async (values: CheckoutFormValues) => {
    setSubmitting(true);
    try {
      const response = await checkoutService.checkout({
        guestEmail: values.guestEmail || undefined,
        shippingAddress: values.shippingAddress,
        billingAddress: values.billingSameAsShipping ? values.shippingAddress : values.billingAddress,
        paymentMethod: values.paymentMethod,
      });

      sessionStorage.setItem('lastOrder', JSON.stringify(response.order));

      if (response.payment.provider === 'STRIPE') {
        setStripeSecret(response.payment.clientSecret);
        setPendingOrderId(response.order.id);
      } else {
        await queryClient.invalidateQueries({ queryKey: ['cart'] });
        toast.success('Order placed!');
        router.push(`/order-confirmation/${response.order.id}`);
      }
    } catch {
      toast.error('Checkout failed. Please check your details and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (stripeSecret && pendingOrderId) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="mb-8 text-3xl font-black tracking-tight uppercase">Payment</h1>
        <StripePaymentForm
          clientSecret={stripeSecret}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['cart'] });
            router.push(`/order-confirmation/${pendingOrderId}`);
          }}
        />
      </div>
    );
  }

  if (!cart || cart.cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-3xl font-black tracking-tight uppercase">Your cart is empty</h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-black tracking-tight uppercase">Checkout</h1>

      <FormProvider {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-10 lg:grid-cols-[1fr_360px]"
        >
          <div className="space-y-8">
            {!user && (
              <div>
                <Label htmlFor="guestEmail">Email</Label>
                <Input id="guestEmail" type="email" {...form.register('guestEmail')} />
                {form.formState.errors.guestEmail && (
                  <p className="mt-1 text-xs text-destructive">
                    {form.formState.errors.guestEmail.message}
                  </p>
                )}
              </div>
            )}

            <div>
              <h2 className="mb-3 text-xs font-semibold tracking-wide uppercase">Shipping address</h2>
              <AddressFields prefix="shippingAddress" />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="billingSame"
                type="checkbox"
                {...form.register('billingSameAsShipping')}
                className="h-4 w-4"
              />
              <Label htmlFor="billingSame">Billing address same as shipping</Label>
            </div>

            {!billingSame && (
              <div>
                <h2 className="mb-3 text-xs font-semibold tracking-wide uppercase">Billing address</h2>
                <AddressFields prefix="billingAddress" />
              </div>
            )}

            <div>
              <h2 className="mb-3 text-xs font-semibold tracking-wide uppercase">Payment method</h2>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 border border-border px-4 py-3 text-sm has-[:checked]:border-foreground">
                  <input type="radio" value="COD" {...form.register('paymentMethod')} />
                  Cash on delivery
                </label>
                <label className="flex items-center gap-2 border border-border px-4 py-3 text-sm has-[:checked]:border-foreground">
                  <input type="radio" value="STRIPE" {...form.register('paymentMethod')} />
                  Card (Stripe)
                </label>
              </div>
            </div>
          </div>

          <div className="h-fit space-y-4 border border-border p-6 lg:sticky lg:top-24">
            <h2 className="text-xs font-semibold tracking-wide uppercase">Order summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(cart.totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatPrice(cart.totals.taxTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{formatPrice(cart.totals.shippingTotal)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatPrice(cart.totals.grandTotal)}</span>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full rounded-none font-semibold tracking-wide uppercase"
              disabled={submitting}
            >
              {submitting
                ? 'Placing order...'
                : paymentMethod === 'STRIPE'
                  ? 'Continue to payment'
                  : 'Place order'}
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
