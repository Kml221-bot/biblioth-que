import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MarketplaceController } from "./marketplace.controller";
import { MarketplaceRepository } from "./marketplace.repository";
import { MarketplaceService } from "./marketplace.service";

@Module({
  imports: [AuthModule],
  controllers: [MarketplaceController],
  providers: [MarketplaceService, MarketplaceRepository],
  exports: [MarketplaceService, MarketplaceRepository],
})
export class MarketplaceModule {}
