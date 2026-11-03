import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { AddWishlistItemDto } from './dto/add-wishlist-item.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@ApiTags('wishlist')
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  getWishlist(@CurrentUser() user: AuthenticatedUser) {
    return this.wishlistService.getOrCreateWishlist(user.id);
  }

  @Post('items')
  addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddWishlistItemDto,
  ) {
    return this.wishlistService.addItem(user.id, dto.productId);
  }

  @Delete('items/:productId')
  removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.removeItem(user.id, productId);
  }

  @Post('items/:productId/move-to-cart')
  moveToCart(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.moveToCart(user.id, productId);
  }

  @Public()
  @Get('shared/:token')
  getShared(@Param('token') token: string) {
    return this.wishlistService.getSharedWishlist(token);
  }
}
