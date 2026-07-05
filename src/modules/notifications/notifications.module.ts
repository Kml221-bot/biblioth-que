import { BullModule } from "@nestjs/bull";
import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { EmailService } from "./channels/email.service";
import { PushService } from "./channels/push.service";
import { SmsService } from "./channels/sms.service";
import { WhatsAppService } from "./channels/whatsapp.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationProcessor } from "./notifications.processor";
import { NotificationsRepository } from "./notifications.repository";
import { NotificationsService } from "./notifications.service";

@Module({
  imports: [AuthModule, BullModule.registerQueue({ name: "notifications" })],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsRepository,
    WhatsAppService,
    EmailService,
    SmsService,
    PushService,
    NotificationProcessor,
  ],
  exports: [NotificationsService, NotificationsRepository],
})
export class NotificationsModule {}
