import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { AuthorsController } from "./authors.controller";
import { AuthorsRepository } from "./authors.repository";
import { AuthorsService } from "./authors.service";

@Module({
  imports: [AuthModule],
  controllers: [AuthorsController],
  providers: [AuthorsService, AuthorsRepository],
  exports: [AuthorsService, AuthorsRepository],
})
export class AuthorsModule {}
