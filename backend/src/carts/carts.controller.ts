import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CartsService } from './carts.service';
import { CartId } from './cart-identity.decorator';
import type { CartIdentity } from './carts.service';
import { Public } from '../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { AddItemDto } from './dto/add-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@ApiTags('cart')
@Public()
@UseGuards(OptionalJwtAuthGuard)
@Controller('cart')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get()
  async getCart(@CartId() identity: CartIdentity) {
    const cart = await this.cartsService.getOrCreateCart(identity);
    return { cart, totals: this.cartsService.calculateTotals(cart) };
  }

  @Post('items')
  async addItem(@CartId() identity: CartIdentity, @Body() dto: AddItemDto) {
    const cart = await this.cartsService.addItem(
      identity,
      dto.productId,
      dto.quantity,
    );
    return { cart, totals: this.cartsService.calculateTotals(cart) };
  }

  @Put('items/:productId')
  async updateItem(
    @CartId() identity: CartIdentity,
    @Param('productId') productId: string,
    @Body() dto: UpdateItemDto,
  ) {
    const cart = await this.cartsService.updateItem(
      identity,
      productId,
      dto.quantity,
    );
    return { cart, totals: this.cartsService.calculateTotals(cart) };
  }

  @Delete('items/:productId')
  async removeItem(
    @CartId() identity: CartIdentity,
    @Param('productId') productId: string,
  ) {
    const cart = await this.cartsService.removeItem(identity, productId);
    return { cart, totals: this.cartsService.calculateTotals(cart) };
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  clear(@CartId() identity: CartIdentity) {
    return this.cartsService.clear(identity);
  }
}
