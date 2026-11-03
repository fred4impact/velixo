import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { DashboardService } from './dashboard.service';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('dashboard')
@Roles(Role.ADMIN)
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  getStats() {
    return this.dashboardService.getStats();
  }
}
