'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCart, useRemoveCartItem, useUpdateCartItem } from '@/hooks/use-cart';
import { formatPrice } from '@/lib/format';

export default function CartPage() {
  const { data, isLoading } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  if (isLoading) {
    return <div className="mx-auto max-w-5xl px-4 py-16">Loading cart...</div>;
  }

  const items = data?.cart.items ?? [];

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24 text-center">
        <h1 className="text-3xl font-black tracking-tight uppercase">Your cart is empty</h1>
        <Button asChild className="mt-8 rounded-none font-semibold tracking-wide uppercase" size="lg">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="mb-8 text-3xl font-black tracking-tight uppercase">Your cart</h1>

      <div className="divide-y divide-border border-t border-border">
        {items.map((item) => {
          const image = item.product.images[0]?.url;
          const price = Number(item.product.salePrice ?? item.product.regularPrice);
          return (
            <div key={item.id} className="flex items-center gap-4 py-5">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden bg-muted">
                {image && <Image src={image} alt={item.product.name} fill className="object-cover" />}
              </div>
              <div className="flex-1">
                <p className="font-medium">{item.product.name}</p>
                <p className="text-sm text-muted-foreground">{formatPrice(price)} each</p>
              </div>
              <div className="flex items-center border border-border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-none"
                  onClick={() =>
                    updateItem.mutate({ productId: item.productId, quantity: Math.max(1, item.quantity - 1) })
                  }
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center text-sm">{item.quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-none"
                  onClick={() =>
                    updateItem.mutate({ productId: item.productId, quantity: item.quantity + 1 })
                  }
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="w-20 text-right font-semibold">{formatPrice(price * item.quantity)}</p>
              <Button variant="ghost" size="icon" onClick={() => removeItem.mutate(item.productId)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>

      {data && (
        <div className="ml-auto mt-8 w-full max-w-sm space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(data.totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span>{formatPrice(data.totals.taxTotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span>{formatPrice(data.totals.shippingTotal)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>{formatPrice(data.totals.grandTotal)}</span>
          </div>
          <Button asChild className="mt-4 w-full rounded-none font-semibold tracking-wide uppercase" size="lg">
            <Link href="/checkout">Checkout</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
