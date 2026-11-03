import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CartsService } from '../carts/carts.service';

@Injectable()
export class WishlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartsService: CartsService,
  ) {}

  private wishlistInclude = {
    items: {
      include: { product: { include: { images: true } } },
      orderBy: { createdAt: 'desc' as const },
    },
  };

  async getOrCreateWishlist(userId: string) {
    let wishlist = await this.prisma.wishlist.findUnique({
      where: { userId },
      include: this.wishlistInclude,
    });
    if (!wishlist) {
      wishlist = await this.prisma.wishlist.create({
        data: { userId, shareToken: randomBytes(16).toString('hex') },
        include: this.wishlistInclude,
      });
    }
    return wishlist;
  }

  async addItem(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product || product.isArchived)
      throw new NotFoundException('Product not found');

    const wishlist = await this.getOrCreateWishlist(userId);
    await this.prisma.wishlistItem.upsert({
      where: { wishlistId_productId: { wishlistId: wishlist.id, productId } },
      update: {},
      create: { wishlistId: wishlist.id, productId },
    });
    return this.getOrCreateWishlist(userId);
  }

  async removeItem(userId: string, productId: string) {
    const wishlist = await this.getOrCreateWishlist(userId);
    await this.prisma.wishlistItem.deleteMany({
      where: { wishlistId: wishlist.id, productId },
    });
    return this.getOrCreateWishlist(userId);
  }

  async moveToCart(userId: string, productId: string) {
    const wishlist = await this.getOrCreateWishlist(userId);
    const item = wishlist.items.find((i) => i.productId === productId);
    if (!item) throw new NotFoundException('Item not in wishlist');

    const cart = await this.cartsService.addItem({ userId }, productId, 1);
    await this.prisma.wishlistItem.deleteMany({
      where: { wishlistId: wishlist.id, productId },
    });
    return {
      wishlist: await this.getOrCreateWishlist(userId),
      cart,
      totals: this.cartsService.calculateTotals(cart),
    };
  }

  async getSharedWishlist(shareToken: string) {
    const wishlist = await this.prisma.wishlist.findUnique({
      where: { shareToken },
      include: {
        ...this.wishlistInclude,
        user: { select: { firstName: true, lastName: true } },
      },
    });
    if (!wishlist) throw new NotFoundException('Wishlist not found');

    const { user, ...rest } = wishlist;
    return {
      ...rest,
      ownerName:
        [user.firstName, user.lastName].filter(Boolean).join(' ') ||
        'A shopper',
    };
  }
}
