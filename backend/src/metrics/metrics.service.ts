import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry = new client.Registry();

  readonly httpRequestsTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests handled',
    labelNames: ['method', 'route', 'status_code'],
    registers: [this.registry],
  });

  readonly httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.registry],
  });

  constructor() {
    // Node.js process metrics (heap, event loop lag, GC) — same signal the
    // "Node.js Application Dashboard" Grafana imports expect.
    client.collectDefaultMetrics({ register: this.registry });
  }

  observeHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    durationSeconds: number,
  ) {
    const labels = { method, route, status_code: String(statusCode) };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, durationSeconds);
  }
}
