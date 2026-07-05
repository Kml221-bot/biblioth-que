import { registerAs } from "@nestjs/config";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import {
  BookEntity, BookNoteEntity, BorrowEntity,
  ChapterEntity, CoinTransactionEntity, SubscriptionEntity,
  UserChapterAccessEntity, UserEntity, UserStatsEntity,
} from "../entities";

export const typeormConfig = registerAs("typeorm", (): TypeOrmModuleOptions => {
  // Utiliser DIRECT_URL en priorité (évite pgbouncer qui bloque TypeORM)
  // Sinon DATABASE_URL sans le paramètre pgbouncer
  const rawUrl = process.env.DIRECT_URL
    || (process.env.DATABASE_URL || "").replace("?pgbouncer=true", "");

  return {
    type: "postgres",
    url: rawUrl,
    ssl: { rejectUnauthorized: false },
    entities: [
      UserEntity, BookEntity, ChapterEntity, UserChapterAccessEntity,
      CoinTransactionEntity, SubscriptionEntity, BorrowEntity,
      BookNoteEntity, UserStatsEntity,
    ],
    synchronize: false,
    logging: false,
    connectTimeoutMS: 5_000,
    metadataTableName: "typeorm_metadata",
    extra: {
      max: 2,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 10_000,
      query_timeout: 5_000,
    },
  };
});
