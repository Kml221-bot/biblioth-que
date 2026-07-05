import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { GamificationModule } from "../gamification/gamification.module";
import { BorrowsController } from "./borrows.controller";
import { BorrowsRepository } from "./borrows.repository";
import { BorrowsService } from "./borrows.service";
import { QuotaService } from "./quota.service";

@Module({
  imports: [AuthModule, GamificationModule],
  controllers: [BorrowsController],
  providers: [BorrowsService, BorrowsRepository, QuotaService],
  exports: [BorrowsService, BorrowsRepository, QuotaService],
})
export class BorrowsModule {}
