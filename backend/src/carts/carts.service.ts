import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CartIdentity {
  userId?: string;
  guestId?: string;
}

@Injectable()
export class CartsService {
  private readonly taxRate: number;
  private readonly shippingRate: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.taxRate = Number(this.config.get('FLAT_TAX_RATE') ?? 0.08);
    this.shippingRate = Number(this.config.get('FLAT_SHIPPING_RATE') ?? 5);
  }

  private cartInclude = {
    items: {
      include: { product: { include: { images: true } } },
      orderBy: { createdAt: 'asc' as const },
    },
  };

  async getOrCreateCart(identity: CartIdentity) {
    if (!identity.userId && !identity.guestId) {
      throw new BadRequestException('Missing cart identity');
    }

    if (identity.userId) {
      // Merge a pre-login guest cart into the user's cart, if present.
      if (identity.guestId) {
        await this.mergeGuestCartIntoUser(identity.guestId, identity.userId);
      }
      let cart = await this.prisma.cart.findUnique({
        where: { userId: identity.userId },
        include: this.cartInclude,
      });
      if (!cart) {
        cart = await this.prisma.cart.create({
          data: { userId: identity.userId },
          include: this.cartInclude,
        });
      }
      return cart;
    }

    let cart = await this.prisma.cart.findUnique({
      where: { guestId: identity.guestId },
      include: this.cartInclude,
    });
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { guestId: identity.guestId },
        include: this.cartInclude,
      });
    }
    return cart;
  }

  private async mergeGuestCartIntoUser(guestId: string, userId: string) {
    const guestCart = await this.prisma.cart.findUnique({
      where: { guestId },
      include: { items: true },
    });
    if (!guestCart || guestCart.items.length === 0) return;

    const userCart = await this.prisma.cart.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    for (const item of guestCart.items) {
      await this.prisma.cartItem.upsert({
        where: {
          cartId_productId: { cartId: userCart.id, productId: item.productId },
        },
        update: { quantity: { increment: item.quantity } },
        create: {
          cartId: userCart.id,
          productId: item.productId,
          quantity: item.quantity,
        },
      });
    }
    await this.prisma.cart.delete({ where: { id: guestCart.id } });
  }

  async addItem(identity: CartIdentity, productId: string, quantity: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product || product.isArchived)
      throw new NotFoundException('Product not found');

    const cart = await this.getOrCreateCart(identity);
    await this.prisma.cartItem.upsert({
      where: { cartId_productId: { cartId: cart.id, productId } },
      update: { quantity: { increment: quantity } },
      create: { cartId: cart.id, productId, quantity },
    });
    return this.getOrCreateCart(identity);
  }

  async updateItem(
    identity: CartIdentity,
    productId: string,
    quantity: number,
  ) {
    const cart = await this.getOrCreateCart(identity);
    const item = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });
    if (!item) throw new NotFoundException('Item not in cart');
    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });
    return this.getOrCreateCart(identity);
  }

  async removeItem(identity: CartIdentity, productId: string) {
    const cart = await this.getOrCreateCart(identity);
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id, productId },
    });
    return this.getOrCreateCart(identity);
  }

  async clear(identity: CartIdentity) {
    const cart = await this.getOrCreateCart(identity);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  calculateTotals(
    cart: Prisma.CartGetPayload<{
      include: { items: { include: { product: true } } };
    }>,
  ) {
    const subtotal = cart.items.reduce((sum, item) => {
      const price = item.product.salePrice ?? item.product.regularPrice;
      return sum + Number(price) * item.quantity;
    }, 0);
    const taxTotal = Number((subtotal * this.taxRate).toFixed(2));
    const shippingTotal = cart.items.length > 0 ? this.shippingRate : 0;
    const grandTotal = Number((subtotal + taxTotal + shippingTotal).toFixed(2));
    return {
      subtotal: Number(subtotal.toFixed(2)),
      taxTotal,
      shippingTotal,
      grandTotal,
    };
  }
}
