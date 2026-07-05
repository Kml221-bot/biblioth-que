import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { GamificationController } from "./gamification.controller";
import { GamificationRepository } from "./gamification.repository";
import { GamificationService } from "./gamification.service";

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({ name: "notifications" }),
  ],
  controllers: [GamificationController],
  providers: [GamificationService, GamificationRepository],
  exports: [GamificationService],
})
export class GamificationModule {}
