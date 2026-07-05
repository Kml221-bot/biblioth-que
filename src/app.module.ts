import { CacheModule } from "@nestjs/cache-manager";
import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule } from "@nestjs/throttler";
import { redisStore } from "cache-manager-ioredis-yet";
import { AdminModule } from "./modules/admin/admin.module";
import { AiModule } from "./modules/ai/ai.module";
import { WeatherModule } from "./modules/weather/weather.module";
import { OpenLibraryModule } from "./modules/open-library/open-library.module";
import { ChaptersModule } from "./modules/chapters/chapters.module";
import { CoinsModule } from "./modules/coins/coins.module";
import { MetricsModule } from "./modules/metrics/metrics.module";
// TypeORM entities disponibles dans src/entities/ — voir typeorm.config.ts
// TypeORM est configuré mais utilise Prisma comme ORM principal pour éviter
// les conflits avec pgbouncer en développement.
import { AuthorsModule } from "./modules/authors/authors.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BooksModule } from "./modules/books/books.module";
import { BorrowsModule } from "./modules/borrows/borrows.module";
import { CommunitiesModule } from "./modules/communities/communities.module";
import { GamificationModule } from "./modules/gamification/gamification.module";
import { HealthModule } from "./modules/health/health.module";
import { MarketplaceModule } from "./modules/marketplace/marketplace.module";
import { NotesModule } from "./modules/notes/notes.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { SchedulerModule } from "./modules/scheduler/scheduler.module";
import { SearchModule } from "./modules/search/search.module";
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module";
import { UsersModule } from "./modules/users/users.module";
import { PrismaModule } from "./prisma/prisma.module";
import {
  appConfig,
  naboopayConfig,
  envValidationSchema,
  supabaseConfig,
  twilioConfig,
  weatherConfig,
} from "./config/app.config";
import { databaseConfig } from "./config/database.config";
import { jwtConfig } from "./config/jwt.config";
import { redisConfig } from "./config/redis.config";
import { buildRedisOptions } from "./config/redis-options";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [".env"],
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        redisConfig,
        supabaseConfig,
        naboopayConfig,
        twilioConfig,
        weatherConfig,
      ],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>("redis.url");
        const redisHost = configService.get<string>("redis.host", "localhost");
        const hasRedis = !!(redisUrl || redisHost !== "localhost");

        if (hasRedis) {
          try {
            const connectPromise = redisStore({
              ...buildRedisOptions(configService),
              lazyConnect: true,
              enableOfflineQueue: false,
            });
            const store = await Promise.race([
              connectPromise,
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Redis timeout")), 3000)
              ),
            ]);
            return { store, ttl: 300 };
          } catch {
            // Fallback mémoire
          }
        }
        return { ttl: 300 };
      },
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          ...buildRedisOptions(configService),
          lazyConnect: true,
          enableOfflineQueue: true,  // Évite le crash — queues en attente si Redis absent
          connectTimeout: 5000,
          maxRetriesPerRequest: null,
          retryStrategy: (times: number) => Math.min(times * 1000, 30000),
        },
      }),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    BooksModule,
    BorrowsModule,
    PaymentsModule,
    CommunitiesModule,
    GamificationModule,
    MarketplaceModule,
    NotificationsModule,
    AiModule,
    NotesModule,
    AuthorsModule,
    SubscriptionsModule,
    ReviewsModule,
    AdminModule,
    SearchModule,
    SchedulerModule,
    WeatherModule,
    OpenLibraryModule,
    ChaptersModule,
    CoinsModule,
    MetricsModule,
  ],
})
export class AppModule {}
