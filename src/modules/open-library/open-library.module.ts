import { Module } from "@nestjs/common";
import { OpenLibraryController } from "./open-library.controller";
import { OpenLibraryService } from "./open-library.service";

@Module({
  controllers: [OpenLibraryController],
  providers: [OpenLibraryService],
  exports: [OpenLibraryService],
})
export class OpenLibraryModule {}
