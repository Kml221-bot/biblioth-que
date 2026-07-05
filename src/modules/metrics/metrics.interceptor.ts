import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { MetricsService } from "./metrics.service";

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<{ method: string; path: string }>();
    const method = req.method;
    const route = this.normalizeRoute(req.path);
    const end = this.metrics.httpRequestDuration.startTimer({ method, route });

    return next.handle().pipe(
      tap({
        next: () => {
          const res = ctx.switchToHttp().getResponse<{ statusCode: number }>();
          this.metrics.httpRequestsTotal.inc({ method, route, status_code: String(res.statusCode) });
          end();
        },
        error: () => {
          this.metrics.httpRequestsTotal.inc({ method, route, status_code: "500" });
          end();
        },
      })
    );
  }

  private normalizeRoute(path: string): string {
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "/:id")
      .replace(/\/\d+/g, "/:id")
      .slice(0, 60);
  }
}
