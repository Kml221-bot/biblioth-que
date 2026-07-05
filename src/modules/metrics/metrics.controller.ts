import { Controller, Get, Header, Inject, Res } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import type { Response } from "express";
import { MetricsService } from "./metrics.service";

@Controller("metrics")
@ApiTags("Monitoring")
@SkipThrottle()
export class MetricsController {
  constructor(@Inject(MetricsService) private readonly metrics: MetricsService) {}

  @Get()
  @ApiOperation({ summary: "Metriques Prometheus — scrappe par Prometheus toutes les 15s" })
  async getMetrics(@Res() res: Response) {
    res.set("Content-Type", this.metrics.contentType());
    res.end(await this.metrics.getMetrics());
  }
}
