import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService, OrderAddressInput } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { CartId } from '../carts/cart-identity.decorator';
import type { CartIdentity } from '../carts/carts.service';
import { Public } from '../common/decorators/public.decorator';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CheckoutDto, AddressInputDto } from './dto/checkout.dto';

@ApiTags('checkout')
@ApiBearerAuth()
@Public()
@UseGuards(OptionalJwtAuthGuard)
@Controller('checkout')
export class CheckoutController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  async checkout(@CartId() identity: CartIdentity, @Body() dto: CheckoutDto) {
    const shippingAddress = await this.resolveAddress(
      identity.userId,
      dto.shippingAddress,
      dto.shippingAddressId,
    );
    const billingAddress = await this.resolveAddress(
      identity.userId,
      dto.billingAddress,
      dto.billingAddressId,
    );

    const order = await this.ordersService.createOrderFromCart({
      identity,
      guestEmail: dto.guestEmail,
      shippingAddress,
      billingAddress,
      paymentProvider: dto.paymentMethod,
    });

    const payment = await this.paymentsService.initiatePayment(order.id);
    await this.ordersService.sendConfirmationEmail(order.id);

    return { order, payment };
  }

  private async resolveAddress(
    userId: string | undefined,
    inline: AddressInputDto | undefined,
    addressId: string | undefined,
  ): Promise<OrderAddressInput> {
    if (inline) return inline;
    if (!addressId) throw new BadRequestException('Address is required');
    if (!userId)
      throw new BadRequestException('addressId requires an authenticated user');

    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });
    if (!address || address.userId !== userId) {
      throw new ForbiddenException(
        'Address does not belong to the current user',
      );
    }
    return {
      fullName: address.fullName,
      line1: address.line1,
      line2: address.line2 ?? undefined,
      city: address.city,
      region: address.region ?? undefined,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone ?? undefined,
    };
  }
}
