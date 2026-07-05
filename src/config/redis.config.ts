import { registerAs } from "@nestjs/config";

export const redisConfig = registerAs("redis", () => ({
  url: process.env.REDIS_URL,
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === "true",
}));
