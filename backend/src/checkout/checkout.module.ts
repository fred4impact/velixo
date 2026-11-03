import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [OrdersModule, PaymentsModule],
  controllers: [CheckoutController],
})
export class CheckoutModule {}
