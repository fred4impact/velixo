import { Injectable } from '@nestjs/common';
import { OrderStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const LOW_STOCK_THRESHOLD = 10;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const trendWindowStart = new Date(
      startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000,
    );

    const [
      pendingOrdersCount,
      revenueTodayAgg,
      revenueThisWeekAgg,
      lowStockProducts,
      outOfStockCount,
      recentOrders,
      ordersInTrendWindow,
      totalCustomersCount,
      newCustomersThisWeekCount,
    ] = await Promise.all([
      this.prisma.order.count({ where: { status: OrderStatus.PENDING } }),
      this.prisma.order.aggregate({
        _sum: { grandTotal: true },
        where: {
          status: { not: OrderStatus.CANCELLED },
          createdAt: { gte: startOfToday },
        },
      }),
      this.prisma.order.aggregate({
        _sum: { grandTotal: true },
        where: {
          status: { not: OrderStatus.CANCELLED },
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      this.prisma.product.findMany({
        where: { isArchived: false, stockQty: { lte: LOW_STOCK_THRESHOLD } },
        orderBy: { stockQty: 'asc' },
        take: 10,
        select: { id: true, name: true, sku: true, stockQty: true },
      }),
      this.prisma.product.count({ where: { isArchived: false, stockQty: 0 } }),
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { items: true },
      }),
      this.prisma.order.findMany({
        where: {
          status: { not: OrderStatus.CANCELLED },
          createdAt: { gte: trendWindowStart },
        },
        select: { createdAt: true, grandTotal: true },
      }),
      this.prisma.user.count({ where: { role: Role.CUSTOMER } }),
      this.prisma.user.count({
        where: { role: Role.CUSTOMER, createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    const revenueTrend = Array.from({ length: 7 }, (_, i) => {
      const dayStart = new Date(
        trendWindowStart.getTime() + i * 24 * 60 * 60 * 1000,
      );
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const total = ordersInTrendWindow
        .filter((o) => o.createdAt >= dayStart && o.createdAt < dayEnd)
        .reduce((sum, o) => sum + Number(o.grandTotal), 0);
      return { date: dayStart.toISOString().slice(0, 10), total };
    });

    return {
      pendingOrdersCount,
      revenueToday: revenueTodayAgg._sum.grandTotal ?? 0,
      revenueThisWeek: revenueThisWeekAgg._sum.grandTotal ?? 0,
      lowStockProducts,
      outOfStockCount,
      recentOrders,
      revenueTrend,
      totalCustomersCount,
      newCustomersThisWeekCount,
    };
  }
}
