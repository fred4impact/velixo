import { Module } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { WishlistController } from './wishlist.controller';
import { CartsModule } from '../carts/carts.module';

@Module({
  imports: [CartsModule],
  controllers: [WishlistController],
  providers: [WishlistService],
})
export class WishlistModule {}
