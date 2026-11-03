'use client';

import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ordersService } from '@/services/orders.service';
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

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', 'me'],
    queryFn: ordersService.listMine,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => ordersService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'me'] });
      toast.success('Order cancelled');
    },
    onError: () => toast.error('Could not cancel order'),
  });

  if (isLoading) return <p>Loading orders...</p>;
  if (!orders || orders.length === 0) return <p className="text-muted-foreground">No orders yet.</p>;

  return (
    <div>
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{order.orderNumber}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
            </div>
            <div className="mt-3 space-y-1 text-sm">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>
                    {item.productName} &times; {item.quantity}
                  </span>
                  <span>{formatPrice(Number(item.unitPrice) * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-medium">Total: {formatPrice(order.grandTotal)}</span>
              {order.status === 'PENDING' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-none font-semibold tracking-wide uppercase"
                  onClick={() => cancelMutation.mutate(order.id)}
                  disabled={cancelMutation.isPending}
                >
                  Cancel order
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
