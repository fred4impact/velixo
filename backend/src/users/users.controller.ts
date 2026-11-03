import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('me/addresses')
  listAddresses(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.listAddresses(user.id);
  }

  @Post('me/addresses')
  createAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAddressDto,
  ) {
    return this.usersService.createAddress(user.id, dto);
  }

  @Patch('me/addresses/:id')
  updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(user.id, id, dto);
  }

  @Delete('me/addresses/:id')
  deleteAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.usersService.deleteAddress(user.id, id);
  }

  @Roles(Role.ADMIN)
  @Get()
  listCustomers() {
    return this.usersService.listCustomers();
  }

  @Roles(Role.ADMIN)
  @Get(':id')
  getCustomerDetail(@Param('id') id: string) {
    return this.usersService.getCustomerDetail(id);
  }
}
