import { ConfigService } from "@nestjs/config";
import { RedisOptions } from "ioredis";

export const buildRedisOptions = (
  configService: ConfigService
): RedisOptions => {
  const redisUrl = configService.get<string>("redis.url");

  if (redisUrl) {
    const parsedUrl = new URL(redisUrl);
    const isTls = parsedUrl.protocol === "rediss:";

    return {
      host: parsedUrl.hostname,
      port: Number(parsedUrl.port || 6379),
      username: parsedUrl.username
        ? decodeURIComponent(parsedUrl.username)
        : undefined,
      password: parsedUrl.password
        ? decodeURIComponent(parsedUrl.password)
        : undefined,
      tls: isTls ? {} : undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    };
  }

  const useTls = configService.get<boolean>("redis.tls", false);

  return {
    host: configService.get<string>("redis.host", "localhost"),
    port: configService.get<number>("redis.port", 6379),
    password: configService.get<string>("redis.password") || undefined,
    tls: useTls ? {} : undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
};
