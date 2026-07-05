import { Inject, Injectable } from "@nestjs/common";
import {
  NotificationChannel,
  NotificationStatus,
  Prisma,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

export const notificationSelect = {
  id: true,
  userId: true,
  channel: true,
  status: true,
  title: true,
  message: true,
  template: true,
  payload: true,
  sentAt: true,
  readAt: true,
  createdAt: true,
} satisfies Prisma.NotificationSelect;

@Injectable()
export class NotificationsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findUnreadByUser(userId: string, skip: number, take: number) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        readAt: null,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: notificationSelect,
    });
  }

  async countUnreadByUser(userId: string) {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });
  }

  async createLog(data: {
    userId: string;
    channel: NotificationChannel;
    status: NotificationStatus;
    title: string;
    message: string;
    template?: string;
    payload?: Prisma.InputJsonValue;
    sentAt?: Date;
  }) {
    return this.prisma.notification.create({
      data,
      select: notificationSelect,
    });
  }

  async getUserContact(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        whatsappNumber: true,
        nom: true,
        prenom: true,
      },
    });
  }
}
