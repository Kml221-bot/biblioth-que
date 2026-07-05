import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { PaymentsModule } from "../payments/payments.module";
import { SchedulerRepository } from "./scheduler.repository";
import { SchedulerService } from "./scheduler.service";

@Module({
  imports: [
    BullModule.registerQueue({ name: "notifications" }),
    PaymentsModule,
  ],
  providers: [SchedulerService, SchedulerRepository],
  exports: [SchedulerService],
})
export class SchedulerModule {}
