'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock, DollarSign, PackageX, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dashboardService } from '@/services/dashboard.service';
import { formatPrice } from '@/lib/format';
import { OrderStatus } from '@/types';
import { RevenueTrendChart } from '@/components/admin/revenue-trend-chart';

const statusVariant: Record<OrderStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  PAID: 'default',
  PROCESSING: 'default',
  SHIPPED: 'default',
  DELIVERED: 'outline',
  CANCELLED: 'destructive',
};

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  href,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}) {
  const content = (
    <Card
      className={`rounded-none border-none shadow-none ring-1 ring-border ${href ? 'transition-colors hover:bg-muted/50' : ''}`}
    >
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-black tracking-tight">{value}</p>
        {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: dashboardService.getStats,
  });

  if (isLoading || !data) {
    return <p>Loading dashboard...</p>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-black tracking-tight uppercase">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Pending orders" value={String(data.pendingOrdersCount)} icon={Clock} />
        <StatCard label="Revenue today" value={formatPrice(data.revenueToday)} icon={DollarSign} />
        <StatCard
          label="Revenue this week"
          value={formatPrice(data.revenueThisWeek)}
          icon={DollarSign}
        />
        <StatCard label="Out of stock" value={String(data.outOfStockCount)} icon={PackageX} />
        <StatCard
          label="Total customers"
          value={String(data.totalCustomersCount)}
          detail={`+${data.newCustomersThisWeekCount} this week`}
          icon={Users}
          href="/admin/customers"
        />
      </div>

      <Card className="rounded-none border-none shadow-none ring-1 ring-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold tracking-wide uppercase">
            Revenue — last 7 days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueTrendChart data={data.revenueTrend} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-none border-none shadow-none ring-1 ring-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold tracking-wide uppercase">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              Low stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.lowStockProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">All products are well stocked.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.lowStockProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>{product.name}</TableCell>
                      <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={product.stockQty === 0 ? 'destructive' : 'secondary'}>
                          {product.stockQty}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-none border-none shadow-none ring-1 ring-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold tracking-wide uppercase">Recent orders</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <div className="space-y-3">
                {data.recentOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between border border-border p-3 text-sm transition-colors hover:bg-muted"
                  >
                    <div>
                      <p className="font-medium">{order.orderNumber}</p>
                      <p className="text-muted-foreground">{order.user?.email ?? order.guestEmail}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{formatPrice(order.grandTotal)}</span>
                      <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
