'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ordersService } from '@/services/orders.service';
import { Order } from '@/types';
import { formatPrice } from '@/lib/format';

export default function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    const cached = sessionStorage.getItem('lastOrder');
    if (cached) {
      const parsed = JSON.parse(cached) as Order;
      if (parsed.id === id) {
        setOrder(parsed);
        return;
      }
    }
    ordersService
      .getById(id)
      .then(setOrder)
      .catch(() => setOrder(null));
  }, [id]);

  if (order === undefined) {
    return <div className="mx-auto max-w-2xl px-4 py-16 text-center">Loading...</div>;
  }

  if (order === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-foreground" />
        <h1 className="mt-4 text-3xl font-black tracking-tight uppercase">Order placed</h1>
        <p className="mt-2 text-muted-foreground">
          Your order was placed successfully. Check your email for confirmation details.
        </p>
        <Button asChild className="mt-8 rounded-none font-semibold tracking-wide uppercase" size="lg">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-foreground" />
        <h1 className="mt-4 text-3xl font-black tracking-tight uppercase">Thank you for your order!</h1>
        <p className="mt-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Order {order.orderNumber}
        </p>
      </div>

      <div className="mt-8 space-y-3 border border-border p-6">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>
              {item.productName} &times; {item.quantity}
            </span>
            <span>{formatPrice(Number(item.unitPrice) * item.quantity)}</span>
          </div>
        ))}
        <Separator />
        <div className="flex justify-between text-base font-bold">
          <span>Total</span>
          <span>{formatPrice(order.grandTotal)}</span>
        </div>
      </div>

      <div className="mt-4 text-sm text-muted-foreground">
        <p>Shipping to: {order.shippingFullName}, {order.shippingLine1}, {order.shippingCity}</p>
        <p>Payment method: {order.payment?.provider === 'COD' ? 'Cash on delivery' : 'Card'}</p>
      </div>

      <div className="mt-8 text-center">
        <Button asChild className="rounded-none font-semibold tracking-wide uppercase" size="lg">
          <Link href="/products">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
