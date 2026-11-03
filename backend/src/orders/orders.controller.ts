import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('me')
  findMyOrders(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.findMyOrders(user.id);
  }

  @Roles(Role.ADMIN)
  @Get()
  findAllForAdmin() {
    return this.ordersService.findAllForAdmin();
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.findOne(id, { userId: user.id, role: user.role });
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.cancelOrder(id, {
      userId: user.id,
      role: user.role,
    });
  }

  @Roles(Role.ADMIN)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }
}
