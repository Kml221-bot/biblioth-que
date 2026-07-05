import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NaboopayService } from "./naboopay.service";
import { PaymentsController } from "./payments.controller";
import { PaymentsProcessor } from "./payments.processor";
import { PaymentsRepository } from "./payments.repository";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue({ name: "payments" }),
    BullModule.registerQueue({ name: "notifications" }),
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsRepository,
    NaboopayService,
    PaymentsProcessor,
  ],
  exports: [PaymentsService, PaymentsRepository, NaboopayService],
})
export class PaymentsModule {}
