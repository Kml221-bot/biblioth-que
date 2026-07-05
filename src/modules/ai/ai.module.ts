import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AiController } from "./ai.controller";
import { AiRepository } from "./ai.repository";
import { AiService } from "./ai.service";
import { BookTextExtractorService } from "./book-text-extractor.service";

@Module({
  imports: [AuthModule],
  controllers: [AiController],
  providers: [AiService, AiRepository, BookTextExtractorService],
  exports: [AiService, AiRepository],
})
export class AiModule {}
