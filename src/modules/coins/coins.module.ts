import { Module } from "@nestjs/common";
import { CoinsController } from "./coins.controller";
import { CoinsRepository } from "./coins.repository";
import { CoinsService } from "./coins.service";

@Module({
  controllers: [CoinsController],
  providers: [CoinsService, CoinsRepository],
  exports: [CoinsService, CoinsRepository],
})
export class CoinsModule {}
