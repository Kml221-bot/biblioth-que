import { Process, Processor } from "@nestjs/bull";
import { Inject, Logger } from "@nestjs/common";
import {
  NotificationChannel,
  NotificationStatus,
  Prisma,
} from "@prisma/client";
import { Job } from "bull";
import { PushSubscription } from "web-push";
import { EmailService } from "./channels/email.service";
import { PushService } from "./channels/push.service";
import { SmsService } from "./channels/sms.service";
import { WhatsAppService } from "./channels/whatsapp.service";
import { NotificationsRepository } from "./notifications.repository";
import {
  EmailTemplate,
  WhatsAppTemplate,
} from "./templates/notification-templates";

@Processor("notifications")
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @Inject(WhatsAppService)
    private readonly whatsappService: WhatsAppService,
    @Inject(EmailService)
    private readonly emailService: EmailService,
    @Inject(SmsService)
    private readonly smsService: SmsService,
    @Inject(PushService)
    private readonly pushService: PushService,
    @Inject(NotificationsRepository)
    private readonly notificationsRepository: NotificationsRepository
  ) {}

  @Process("whatsapp")
  async handleWhatsApp(
    job: Job<{
      userId: string;
      to: string;
      template: WhatsAppTemplate;
      vars: Record<string, string>;
    }>
  ) {
    try {
      const rendered = await this.whatsappService.send(
        job.data.to,
        job.data.template,
        job.data.vars
      );
      await this.logSent(
        job.data.userId,
        NotificationChannel.WHATSAPP,
        rendered.title,
        rendered.message,
        job.data.template,
        job.data
      );
    } catch (error) {
      await this.logFailed(
        job.data.userId,
        NotificationChannel.WHATSAPP,
        job.data.template,
        error
      );
      throw error;
    }
  }

  @Process("email")
  async handleEmail(
    job: Job<{
      userId: string;
      to: string;
      template: EmailTemplate;
      data: Record<string, string>;
    }>
  ) {
    try {
      const rendered = await this.emailService.send(
        job.data.to,
        job.data.template,
        job.data.data
      );
      await this.logSent(
        job.data.userId,
        NotificationChannel.EMAIL,
        rendered.title,
        rendered.message,
        job.data.template,
        job.data
      );
    } catch (error) {
      await this.logFailed(
        job.data.userId,
        NotificationChannel.EMAIL,
        job.data.template,
        error
      );
      throw error;
    }
  }

  @Process("sms")
  async handleSms(job: Job<{ userId: string; to: string; message: string }>) {
    try {
      const rendered = await this.smsService.send(
        job.data.to,
        job.data.message
      );
      await this.logSent(
        job.data.userId,
        NotificationChannel.SMS,
        rendered.title,
        rendered.message,
        "sms",
        job.data
      );
    } catch (error) {
      await this.logFailed(
        job.data.userId,
        NotificationChannel.SMS,
        "sms",
        error
      );
      throw error;
    }
  }

  @Process("push")
  async handlePush(
    job: Job<{
      userId: string;
      title: string;
      body: string;
      url?: string;
      subscription?: PushSubscription;
    }>
  ) {
    try {
      const rendered = await this.pushService.send(
        job.data.userId,
        job.data.title,
        job.data.body,
        job.data.url,
        job.data.subscription
      );
      await this.logSent(
        job.data.userId,
        NotificationChannel.PUSH,
        rendered.title,
        rendered.message,
        "push",
        job.data
      );
    } catch (error) {
      await this.logFailed(
        job.data.userId,
        NotificationChannel.PUSH,
        "push",
        error
      );
      throw error;
    }
  }

  private async logSent(
    userId: string,
    channel: NotificationChannel,
    title: string,
    message: string,
    template: string,
    payload: unknown
  ) {
    await this.notificationsRepository.createLog({
      userId,
      channel,
      status: NotificationStatus.SENT,
      title,
      message,
      template,
      payload: payload as Prisma.InputJsonValue,
      sentAt: new Date(),
    });
    this.logger.log(`${channel} envoye userId=${userId} template=${template}`);
  }

  private async logFailed(
    userId: string,
    channel: NotificationChannel,
    template: string,
    error: unknown
  ) {
    await this.notificationsRepository.createLog({
      userId,
      channel,
      status: NotificationStatus.FAILED,
      title: "Echec notification",
      message: error instanceof Error ? error.message : "Erreur inconnue",
      template,
      payload: { template },
    });
    this.logger.error(
      `${channel} echoue userId=${userId} template=${template}`
    );
  }
}
