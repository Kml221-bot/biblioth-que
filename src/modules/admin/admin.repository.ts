import { Inject, Injectable } from "@nestjs/common";
import {
  AuthorStatus,
  BookStatus,
  BorrowStatus,
  NotificationStatus,
  PenaltyStatus,
  Prisma,
  SubscriptionStatus,
  TransactionStatus,
  UserStatus,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AdminRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  countActiveUsersSince(from: Date) {
    return this.prisma.user.count({
      where: {
        status: UserStatus.ACTIVE,
        OR: [{ lastLoginAt: { gte: from } }, { createdAt: { gte: from } }],
      },
    });
  }

  countNewUsersSince(from: Date) {
    return this.prisma.user.count({
      where: { createdAt: { gte: from } },
    });
  }

  countActiveBorrows() {
    return this.prisma.borrow.count({
      where: { statut: { in: [BorrowStatus.ACTIVE, BorrowStatus.RENEWAL_PENDING] } },
    });
  }

  async sumCompletedTransactionsBetween(from: Date, to = new Date()) {
    const result = await this.prisma.transaction.aggregate({
      _sum: { montantTotal: true },
      where: {
        status: TransactionStatus.COMPLETED,
        createdAt: { gte: from, lte: to },
      },
    });

    return result._sum.montantTotal ?? 0;
  }

  async sumPendingPenalties() {
    const result = await this.prisma.penalty.aggregate({
      _sum: { montantFcfa: true },
      where: { status: PenaltyStatus.PENDING },
    });

    return result._sum.montantFcfa ?? 0;
  }

  groupActiveSubscriptionsByPlan() {
    return this.prisma.subscription.groupBy({
      by: ["plan"],
      _count: { plan: true },
      where: { status: SubscriptionStatus.ACTIVE },
    });
  }

  findCompletedTransactionsSince(from: Date) {
    return this.prisma.transaction.findMany({
      where: {
        status: TransactionStatus.COMPLETED,
        createdAt: { gte: from },
      },
      select: {
        id: true,
        type: true,
        montantTotal: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  findOverdueBorrows(now: Date) {
    return this.prisma.borrow.findMany({
      where: {
        OR: [
          { statut: BorrowStatus.OVERDUE },
          {
            statut: { in: [BorrowStatus.ACTIVE, BorrowStatus.RENEWAL_PENDING] },
            finPrevue: { lt: now },
          },
        ],
      },
      select: {
        id: true,
        statut: true,
        finPrevue: true,
        user: {
          select: {
            id: true,
            email: true,
            nom: true,
            prenom: true,
            whatsappNumber: true,
          },
        },
        book: {
          select: {
            id: true,
            titre: true,
            auteur: true,
          },
        },
      },
      orderBy: { finPrevue: "asc" },
    });
  }

  updateBookStatus(id: string, status: BookStatus) {
    return this.prisma.book.update({
      where: { id },
      data: {
        status,
        publishedAt: status === BookStatus.PUBLISHED ? new Date() : undefined,
      },
      select: {
        id: true,
        titre: true,
        status: true,
        publishedAt: true,
      },
    });
  }

  waivePenalty(id: string) {
    return this.prisma.penalty.update({
      where: { id },
      data: { status: PenaltyStatus.WAIVED },
      select: {
        id: true,
        status: true,
        montantFcfa: true,
      },
    });
  }

  countUsers(where: Prisma.UserWhereInput) {
    return this.prisma.user.count({ where });
  }

  findUsers(where: Prisma.UserWhereInput, skip: number, take: number) {
    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  }

  suspendUser(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.SUSPENDED },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
  }

  approveAuthor(id: string) {
    return this.prisma.authorProfile.update({
      where: { id },
      data: {
        status: AuthorStatus.APPROVED,
        approvedAt: new Date(),
      },
      select: {
        id: true,
        userId: true,
        status: true,
        approvedAt: true,
      },
    });
  }

  findActiveUserIds() {
    return this.prisma.user.findMany({
      where: { status: UserStatus.ACTIVE },
      select: { id: true },
    });
  }

  createNotifications(data: Prisma.NotificationCreateManyInput[]) {
    return this.prisma.notification.createMany({
      data: data.map((notification) => ({
        ...notification,
        status: NotificationStatus.PENDING,
      })),
      skipDuplicates: true,
    });
  }
}
