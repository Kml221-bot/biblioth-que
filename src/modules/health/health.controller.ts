import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { SkipThrottle } from "@nestjs/throttler";
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
} from "@nestjs/terminus";
import { PrismaHealthIndicator } from "./prisma-health.indicator";
import { RedisHealthIndicator } from "./redis-health.indicator";

@Controller("health")
@ApiTags("Health")
@SkipThrottle()
export class HealthController {
  constructor(
    @Inject(HealthCheckService)
    private readonly health: HealthCheckService,
    @Inject(PrismaHealthIndicator)
    private readonly prismaHealth: PrismaHealthIndicator,
    @Inject(RedisHealthIndicator)
    private readonly redisHealth: RedisHealthIndicator,
    @Inject(MemoryHealthIndicator)
    private readonly memoryHealth: MemoryHealthIndicator,
  ) {}

  /**
   * GET /health — Liveness probe
   * Retourne 200 si l'application tourne (meme si DB/Redis sont down)
   */
  @Get()
  @ApiOperation({ summary: "Liveness — l'application tourne" })
  @ApiResponse({ status: 200, description: "L'application est vivante" })
  liveness() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "bibliotech-api",
    };
  }

  /**
   * GET /health/ready — Readiness probe
   * Retourne 200 seulement si DB + Redis + memoire sont OK
   */
  @Get("ready")
  @HealthCheck()
  @ApiOperation({ summary: "Readiness — DB, Redis et memoire OK" })
  @ApiResponse({ status: 200, description: "Tous les services sont prets" })
  @ApiResponse({ status: 503, description: "Un ou plusieurs services KO" })
  readiness() {
    return this.health.check([
      () => this.prismaHealth.isHealthy("postgres"),
      () => this.redisHealth.isHealthy("redis"),
      // Alerte si heap > 256 MB
      () => this.memoryHealth.checkHeap("memory_heap", 256 * 1024 * 1024),
    ]);
  }
}
