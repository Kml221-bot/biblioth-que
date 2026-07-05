import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BooksController } from "./books.controller";
import { BooksRepository } from "./books.repository";
import { BooksService } from "./books.service";

@Module({
  imports: [AuthModule],
  controllers: [BooksController],
  providers: [BooksService, BooksRepository],
  exports: [BooksService, BooksRepository],
})
export class BooksModule {}
