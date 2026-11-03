'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ordersService } from '@/services/orders.service';
import { formatPrice } from '@/lib/format';
import { OrderStatus } from '@/types';

const STATUSES: OrderStatus[] = ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

function AddressBlock({
  title,
  fullName,
  line1,
  line2,
  city,
  region,
  postal,
  country,
  phone,
}: {
  title: string;
  fullName: string;
  line1: string;
  line2?: string | null;
  city: string;
  region?: string | null;
  postal: string;
  country: string;
  phone?: string | null;
}) {
  return (
    <div className="border border-border p-4">
      <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      <p className="text-sm font-medium">{fullName}</p>
      <p className="text-sm text-muted-foreground">{line1}</p>
      {line2 && <p className="text-sm text-muted-foreground">{line2}</p>}
      <p className="text-sm text-muted-foreground">
        {city}
        {region ? `, ${region}` : ''} {postal}
      </p>
      <p className="text-sm text-muted-foreground">{country}</p>
      {phone && <p className="mt-1 text-sm text-muted-foreground">{phone}</p>}
    </div>
  );
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['admin-order', params.id],
    queryFn: () => ordersService.getById(params.id),
  });

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => ordersService.updateStatus(params.id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-order', params.id], updated);
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Order status updated');
    },
    onError: () => toast.error('Could not update status'),
  });

  if (isLoading || !order) {
    return <p>Loading...</p>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => router.push('/admin/orders')}
        className="mb-6 flex items-center gap-1.5 text-sm font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to orders
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.user?.email ?? order.guestEmail ?? 'Guest'} &middot;{' '}
            {new Date(order.createdAt).toLocaleString()}
          </p>
        </div>
        <Select
          value={order.status}
          onValueChange={(status) => statusMutation.mutate(status as OrderStatus)}
        >
          <SelectTrigger className="w-[160px] rounded-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-6 border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.productName}</TableCell>
                <TableCell className="text-right">{formatPrice(item.unitPrice)}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">
                  {formatPrice((Number(item.unitPrice) * item.quantity).toFixed(2))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="ml-auto max-w-xs space-y-1.5 p-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Tax</span>
            <span>{formatPrice(order.taxTotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Shipping</span>
            <span>{formatPrice(order.shippingTotal)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1.5 text-base font-bold">
            <span>Total</span>
            <span>{formatPrice(order.grandTotal)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <AddressBlock
          title="Shipping address"
          fullName={order.shippingFullName}
          line1={order.shippingLine1}
          line2={order.shippingLine2}
          city={order.shippingCity}
          region={order.shippingRegion}
          postal={order.shippingPostal}
          country={order.shippingCountry}
          phone={order.shippingPhone}
        />
        <AddressBlock
          title="Billing address"
          fullName={order.billingFullName}
          line1={order.billingLine1}
          line2={order.billingLine2}
          city={order.billingCity}
          region={order.billingRegion}
          postal={order.billingPostal}
          country={order.billingCountry}
        />
      </div>

      {order.payment && (
        <div className="mt-4 flex items-center gap-3 border border-border p-4">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Payment</p>
          <Badge variant="outline">{order.payment.provider}</Badge>
          <span className="text-sm text-muted-foreground">{order.payment.status}</span>
          <span className="ml-auto text-sm font-semibold">{formatPrice(order.payment.amount)}</span>
        </div>
      )}
    </div>
  );
}
