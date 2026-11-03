import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { MetricsService } from './metrics.service';

// Excluded from Swagger and from auth — a Prometheus scraper carries
// neither a bearer token nor any interest in API docs.
@ApiExcludeController()
@Public()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain')
  getMetrics() {
    return this.metrics.registry.metrics();
  }
}
