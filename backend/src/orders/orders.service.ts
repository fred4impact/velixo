import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentProvider, Role } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CartsService, CartIdentity } from '../carts/carts.service';
import { MailService } from '../mail/mail.service';

export interface OrderAddressInput {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface CreateOrderParams {
  identity: CartIdentity;
  guestEmail?: string;
  shippingAddress: OrderAddressInput;
  billingAddress: OrderAddressInput;
  paymentProvider: PaymentProvider;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartsService: CartsService,
    private readonly mail: MailService,
  ) {}

  private generateOrderNumber(): string {
    return `ORD-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
  }

  async createOrderFromCart(params: CreateOrderParams) {
    const { identity, shippingAddress, billingAddress, paymentProvider } =
      params;
    const cart = await this.cartsService.getOrCreateCart(identity);

    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }
    for (const item of cart.items) {
      if (item.product.stockQty < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${item.product.name}`,
        );
      }
    }
    if (!identity.userId && !params.guestEmail) {
      throw new BadRequestException(
        'guestEmail is required for guest checkout',
      );
    }

    const totals = this.cartsService.calculateTotals(cart);

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: this.generateOrderNumber(),
          userId: identity.userId,
          guestEmail: identity.userId ? undefined : params.guestEmail,
          status: OrderStatus.PENDING,
          subtotal: totals.subtotal,
          taxTotal: totals.taxTotal,
          shippingTotal: totals.shippingTotal,
          grandTotal: totals.grandTotal,
          shippingFullName: shippingAddress.fullName,
          shippingLine1: shippingAddress.line1,
          shippingLine2: shippingAddress.line2,
          shippingCity: shippingAddress.city,
          shippingRegion: shippingAddress.region,
          shippingPostal: shippingAddress.postalCode,
          shippingCountry: shippingAddress.country,
          shippingPhone: shippingAddress.phone,
          billingFullName: billingAddress.fullName,
          billingLine1: billingAddress.line1,
          billingLine2: billingAddress.line2,
          billingCity: billingAddress.city,
          billingRegion: billingAddress.region,
          billingPostal: billingAddress.postalCode,
          billingCountry: billingAddress.country,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              productName: item.product.name,
              unitPrice: item.product.salePrice ?? item.product.regularPrice,
              quantity: item.quantity,
            })),
          },
          payment: {
            create: {
              provider: paymentProvider,
              status: 'PENDING',
              amount: totals.grandTotal,
            },
          },
        },
        include: { items: true, payment: true },
      });

      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { decrement: item.quantity } },
        });
      }

      return created;
    });

    await this.cartsService.clear(identity);

    return order;
  }

  async findMyOrders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: true, payment: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllForAdmin() {
    return this.prisma.order.findMany({
      include: {
        items: true,
        payment: true,
        user: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, requester: { userId?: string; role?: Role }) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true, payment: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (requester.role !== Role.ADMIN && order.userId !== requester.userId) {
      throw new ForbiddenException();
    }
    return order;
  }

  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true, payment: true },
    });

    const recipientEmail = order.userId
      ? (await this.prisma.user.findUnique({ where: { id: order.userId } }))
          ?.email
      : order.guestEmail;
    if (recipientEmail) {
      await this.mail.sendOrderStatusEmail(
        recipientEmail,
        order.orderNumber,
        status,
      );
    }

    return updated;
  }

  async cancelOrder(id: string, requester: { userId?: string; role?: Role }) {
    const order = await this.findOne(id, requester);
    if (requester.role !== Role.ADMIN && order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Only pending orders can be cancelled by the customer',
      );
    }
    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Order already ${order.status.toLowerCase()}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { increment: item.quantity } },
        });
      }
      return tx.order.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
      });
    });
  }

  async sendConfirmationEmail(orderId: string) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    const recipientEmail = order.userId
      ? (await this.prisma.user.findUnique({ where: { id: order.userId } }))
          ?.email
      : order.guestEmail;
    if (recipientEmail) {
      await this.mail.sendOrderConfirmationEmail(
        recipientEmail,
        order.orderNumber,
        order.grandTotal.toString(),
      );
    }
  }
}
