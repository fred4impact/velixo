'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
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

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: ordersService.listForAdmin,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      ordersService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Order status updated');
    },
    onError: () => toast.error('Could not update status'),
  });

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black tracking-tight uppercase">Orders</h1>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders?.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                </TableCell>
                <TableCell>{order.user?.email ?? order.guestEmail ?? '—'}</TableCell>
                <TableCell>{formatPrice(order.grandTotal)}</TableCell>
                <TableCell>
                  <Badge variant="outline">{order.payment?.provider}</Badge>
                </TableCell>
                <TableCell>
                  <Select
                    value={order.status}
                    onValueChange={(status) =>
                      statusMutation.mutate({ id: order.id, status: status as OrderStatus })
                    }
                  >
                    <SelectTrigger className="w-[150px]">
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
