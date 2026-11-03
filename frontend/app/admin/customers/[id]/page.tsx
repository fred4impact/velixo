'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usersService } from '@/services/users.service';
import { formatPrice } from '@/lib/format';
import { OrderStatus } from '@/types';

const statusVariant: Record<OrderStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  PAID: 'default',
  PROCESSING: 'default',
  SHIPPED: 'default',
  DELIVERED: 'outline',
  CANCELLED: 'destructive',
};

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const { data: customer, isLoading } = useQuery({
    queryKey: ['admin-customer', params.id],
    queryFn: () => usersService.getCustomerDetail(params.id),
  });

  if (isLoading || !customer) {
    return <p>Loading...</p>;
  }

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || '—';

  return (
    <div>
      <button
        type="button"
        onClick={() => router.push('/admin/customers')}
        className="mb-6 flex items-center gap-1.5 text-sm font-semibold tracking-wide text-muted-foreground uppercase transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to customers
      </button>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">{fullName}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {customer.email} &middot; Joined {new Date(customer.createdAt).toLocaleDateString()}
          </p>
        </div>
        {customer.emailVerifiedAt ? (
          <Badge>Verified</Badge>
        ) : (
          <Badge variant="secondary">Unverified</Badge>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Addresses
          </p>
          {customer.addresses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved addresses.</p>
          ) : (
            <div className="space-y-3">
              {customer.addresses.map((address) => (
                <div key={address.id} className="border border-border p-4 text-sm">
                  <p className="font-medium">{address.fullName}</p>
                  <p className="text-muted-foreground">{address.line1}</p>
                  <p className="text-muted-foreground">
                    {address.city}
                    {address.region ? `, ${address.region}` : ''} {address.postalCode}
                  </p>
                  <p className="text-muted-foreground">{address.country}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Orders
          </p>
          {customer.orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {customer.orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between border border-border p-4 text-sm transition-colors hover:bg-muted"
                >
                  <div>
                    <p className="font-medium">{order.orderNumber}</p>
                    <p className="text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatPrice(order.grandTotal)}</span>
                    <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
