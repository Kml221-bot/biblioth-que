import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { GamificationModule } from "../gamification/gamification.module";
import { ReviewsController } from "./reviews.controller";
import { ReviewsRepository } from "./reviews.repository";
import { ReviewsService } from "./reviews.service";

@Module({
  imports: [AuthModule, GamificationModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewsRepository],
  exports: [ReviewsService, ReviewsRepository],
})
export class ReviewsModule {}
