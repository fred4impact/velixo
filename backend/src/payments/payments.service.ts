import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentProvider, PaymentStatus } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly ordersService: OrdersService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY')!);
  }

  async initiatePayment(orderId: string) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { payment: true },
    });
    if (!order.payment)
      throw new BadRequestException('Order has no payment record');

    if (order.payment.provider === PaymentProvider.COD) {
      return { provider: PaymentProvider.COD };
    }

    const amountInCents = Math.round(Number(order.grandTotal) * 100);
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
    });

    await this.prisma.payment.update({
      where: { orderId },
      data: { providerRef: paymentIntent.id },
    });

    return {
      provider: PaymentProvider.STRIPE,
      clientSecret: paymentIntent.client_secret,
    };
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET')!;
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  }

  async handleWebhookEvent(event: Stripe.Event) {
    if (
      event.type === 'payment_intent.succeeded' ||
      event.type === 'payment_intent.payment_failed'
    ) {
      const paymentIntent = event.data.object;
      const payment = await this.prisma.payment.findFirst({
        where: { providerRef: paymentIntent.id },
      });
      if (!payment) {
        this.logger.warn(
          `No payment found for PaymentIntent ${paymentIntent.id}`,
        );
        return;
      }

      if (event.type === 'payment_intent.succeeded') {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.PAID },
        });
        await this.ordersService.updateStatus(
          payment.orderId,
          OrderStatus.PAID,
        );
      } else {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED },
        });
      }
    }
  }
}
