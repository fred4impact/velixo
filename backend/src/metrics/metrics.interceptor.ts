import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { tap } from 'rxjs';
import { MetricsService } from './metrics.service';

// Route-templated (e.g. "/products/:id", not "/products/abc123") so labels
// don't explode cardinality — every distinct product id would otherwise
// become its own time series.
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    if (context.getType() !== 'http') return next.handle();

    const start = process.hrtime.bigint();
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const record = () => {
      // express-serve-static-core types `req.route` loosely; narrow it by
      // hand rather than let `any` leak into the metrics label.
      const routePath: unknown = (req as { route?: { path?: unknown } }).route
        ?.path;
      const route = typeof routePath === 'string' ? routePath : req.path;
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
      this.metrics.observeHttpRequest(
        req.method,
        route,
        res.statusCode,
        durationSeconds,
      );
    };

    return next.handle().pipe(tap({ next: record, error: record }));
  }
}
