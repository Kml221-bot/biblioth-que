import { CACHE_MANAGER, Cache } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from "@nestjs/terminus";

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const testKey = "__health_check__";
      await this.cacheManager.set(testKey, "ok", 5_000);
      const value = await this.cacheManager.get(testKey);

      if (value !== "ok") {
        throw new Error("Redis read/write echec");
      }

      return this.getStatus(key, true);
    } catch (error) {
      throw new HealthCheckError(
        "Redis indisponible",
        this.getStatus(key, false, {
          message: error instanceof Error ? error.message : "Connexion echouee",
        }),
      );
    }
  }
}
