import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { GamificationModule } from "../gamification/gamification.module";
import { CommunitiesController } from "./communities.controller";
import { CommunitiesRepository } from "./communities.repository";
import { CommunitiesService } from "./communities.service";

@Module({
  imports: [AuthModule, GamificationModule],
  controllers: [CommunitiesController],
  providers: [CommunitiesService, CommunitiesRepository],
  exports: [CommunitiesService, CommunitiesRepository],
})
export class CommunitiesModule {}
