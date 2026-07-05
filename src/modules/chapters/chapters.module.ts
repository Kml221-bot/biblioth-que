import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { CoinsRepository } from "../coins/coins.repository";
import { ChaptersController } from "./chapters.controller";
import { ChaptersRepository } from "./chapters.repository";
import { ChaptersService } from "./chapters.service";

@Module({
  imports: [BullModule.registerQueue({ name: "notifications" })],
  controllers: [ChaptersController],
  providers: [ChaptersService, ChaptersRepository, CoinsRepository],
  exports: [ChaptersService],
})
export class ChaptersModule {}
