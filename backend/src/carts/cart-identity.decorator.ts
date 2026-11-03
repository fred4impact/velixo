import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { CartIdentity } from './carts.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

export const CartId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CartIdentity => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const userId = request.user?.id;
    const guestId = request.headers['x-guest-id'] as string | undefined;
    if (!userId && !guestId) {
      throw new BadRequestException(
        'Missing X-Guest-Id header for guest cart access',
      );
    }
    return { userId, guestId };
  },
);
