import { IsIn } from 'class-validator';
import { OrderStatus } from '@prisma/client';

const STATUSES: OrderStatus[] = [
  'PENDING',
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

export class UpdateOrderStatusDto {
  @IsIn(STATUSES)
  status: OrderStatus;
}
