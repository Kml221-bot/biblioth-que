import { CACHE_MANAGER, Cache } from "@nestjs/cache-manager";
import { InjectQueue } from "@nestjs/bull";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { NotificationChannel } from "@prisma/client";
import { Queue } from "bull";
import { Prisma } from "@prisma/client";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PaginationMetaDto } from "../../common/dto/response.dto";
import {
  NotificationPreferencesResponseDto,
  NotificationResponseDto,
  UpdateNotificationPreferencesDto,
} from "./dto";
import { NotificationsRepository } from "./notifications.repository";
import {
  EmailTemplate,
  WhatsAppTemplate,
} from "./templates/notification-templates";

type NotificationRecord = Awaited<
  ReturnType<NotificationsRepository["findUnreadByUser"]>
>[number];

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(NotificationsRepository)
    private readonly notificationsRepository: NotificationsRepository,
    @InjectQueue("notifications") private readonly notificationsQueue: Queue,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {}

  async getUnread(userId: string, pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      this.notificationsRepository.findUnreadByUser(userId, skip, limit),
      this.notificationsRepository.countUnreadByUser(userId),
    ]);

    return {
      data: notifications.map(notification => this.toResponse(notification)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      } satisfies PaginationMetaDto,
    };
  }

  async markAsRead(id: string, userId: string) {
    const result = await this.notificationsRepository.markAsRead(id, userId);

    if (result.count === 0) {
      throw new NotFoundException("Notification introuvable");
    }

    return { read: true };
  }

  async markAllAsRead(userId: string) {
    const result = await this.notificationsRepository.markAllAsRead(userId);

    return { count: result.count };
  }

  async getPreferences(
    userId: string
  ): Promise<NotificationPreferencesResponseDto> {
    const cached =
      await this.cacheManager.get<NotificationPreferencesResponseDto>(
        this.preferencesKey(userId)
      );

    return cached ?? this.defaultPreferences();
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto
  ) {
    const current = await this.getPreferences(userId);
    const updated = { ...current, ...dto };

    await this.cacheManager.set(this.preferencesKey(userId), updated, 0);

    return updated;
  }

  async enqueueWhatsApp(
    userId: string,
    template: WhatsAppTemplate,
    vars: Record<string, string | number | undefined>
  ) {
    const user = await this.notificationsRepository.getUserContact(userId);

    if (!user?.whatsappNumber) {
      throw new NotFoundException("Numero WhatsApp utilisateur introuvable");
    }

    return this.notificationsQueue.add(
      "whatsapp",
      {
        userId,
        to: user.whatsappNumber,
        template,
        vars,
      },
      { attempts: 3, backoff: { type: "exponential", delay: 2_000 } }
    );
  }

  async enqueueEmail(
    userId: string,
    template: EmailTemplate,
    data: Record<string, string | number | undefined>
  ) {
    const user = await this.notificationsRepository.getUserContact(userId);

    if (!user?.email) {
      throw new NotFoundException("Email utilisateur introuvable");
    }

    return this.notificationsQueue.add(
      "email",
      {
        userId,
        to: user.email,
        template,
        data,
      },
      { attempts: 3, backoff: { type: "exponential", delay: 2_000 } }
    );
  }

  async enqueueSms(userId: string, message: string) {
    const user = await this.notificationsRepository.getUserContact(userId);

    if (!user?.whatsappNumber) {
      throw new NotFoundException("Telephone utilisateur introuvable");
    }

    return this.notificationsQueue.add(
      "sms",
      {
        userId,
        to: user.whatsappNumber.replace("whatsapp:", ""),
        message,
      },
      { attempts: 3, backoff: { type: "exponential", delay: 2_000 } }
    );
  }

  async enqueuePush(
    userId: string,
    title: string,
    body: string,
    url?: string,
    subscription?: Prisma.JsonValue
  ) {
    return this.notificationsQueue.add(
      "push",
      {
        userId,
        title,
        body,
        url,
        subscription,
      },
      { attempts: 3, backoff: { type: "exponential", delay: 2_000 } }
    );
  }

  private toResponse(
    notification: NotificationRecord
  ): NotificationResponseDto {
    return {
      id: notification.id,
      channel: notification.channel,
      status: notification.status,
      title: notification.title,
      message: notification.message,
      template: notification.template,
      sentAt: notification.sentAt,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };
  }

  private preferencesKey(userId: string) {
    return `notifications:preferences:${userId}`;
  }

  private defaultPreferences(): NotificationPreferencesResponseDto {
    return {
      whatsapp: true,
      email: true,
      sms: true,
      push: true,
    };
  }
}
