import { Inject, Injectable } from "@nestjs/common";
import {
  AuthorStatus,
  BookStatus,
  BorrowStatus,
  PenaltyStatus,
  Prisma,
  SubscriptionPlan,
  SubscriptionStatus,
  UserStatus,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class SchedulerRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findActiveBorrowsForOverdueCheck() {
    return this.prisma.borrow.findMany({
      where: {
        statut: {
          in: [BorrowStatus.ACTIVE, BorrowStatus.OVERDUE],
        },
      },
      select: {
        id: true,
        userId: true,
        finPrevue: true,
        rappelJ3Envoye: true,
        rappelJ1Envoye: true,
        user: {
          select: {
            id: true,
            email: true,
            whatsappNumber: true,
          },
        },
        book: {
          select: {
            titre: true,
          },
        },
      },
    });
  }

  async markReminderJ3Sent(borrowId: string) {
    return this.prisma.borrow.update({
      where: { id: borrowId },
      data: { rappelJ3Envoye: true },
      select: { id: true },
    });
  }

  async markReminderJ1Sent(borrowId: string) {
    return this.prisma.borrow.update({
      where: { id: borrowId },
      data: { rappelJ1Envoye: true },
      select: { id: true },
    });
  }

  async upsertPenaltyAndMarkOverdue(params: {
    borrowId: string;
    userId: string;
    joursRetard: number;
    montantFcfa: number;
  }) {
    return this.prisma.$transaction(async tx => {
      await tx.borrow.update({
        where: { id: params.borrowId },
        data: { statut: BorrowStatus.OVERDUE },
        select: { id: true },
      });

      const existingPenalty = await tx.penalty.findFirst({
        where: {
          borrowId: params.borrowId,
          status: PenaltyStatus.PENDING,
        },
        select: { id: true },
      });

      if (existingPenalty) {
        return tx.penalty.update({
          where: { id: existingPenalty.id },
          data: {
            joursRetard: params.joursRetard,
            montantFcfa: params.montantFcfa,
          },
          select: { id: true, montantFcfa: true },
        });
      }

      return tx.penalty.create({
        data: {
          borrowId: params.borrowId,
          userId: params.userId,
          joursRetard: params.joursRetard,
          montantFcfa: params.montantFcfa,
          reason: "Retard de retour du livre",
        },
        select: { id: true, montantFcfa: true },
      });
    });
  }

  async suspendUser(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.SUSPENDED },
      select: { id: true },
    });
  }

  async resetFreeQuotas() {
    return this.prisma.subscription.updateMany({
      where: {
        plan: SubscriptionPlan.FREE,
        status: SubscriptionStatus.ACTIVE,
      },
      data: {
        empruntsRestants: 3,
      },
    });
  }

  async findAutoRenewSubscriptions() {
    return this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        endsAt: {
          lte: new Date(),
        },
      },
      select: {
        id: true,
        userId: true,
        plan: true,
      },
    });
  }

  async extendSubscription(subscriptionId: string, endsAt: Date) {
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: { endsAt },
      select: { id: true },
    });
  }

  async findUsersForMonthlyStats(monthStart: Date) {
    return this.prisma.user.findMany({
      where: { status: UserStatus.ACTIVE },
      select: {
        id: true,
        email: true,
        nom: true,
        readingSessions: {
          where: { createdAt: { gte: monthStart } },
          select: {
            bookId: true,
            pageDebut: true,
            pageFin: true,
            dureeMinutes: true,
          },
        },
      },
    });
  }

  async resetStreakIfNoReading(userId: string) {
    return this.prisma.userStats.updateMany({
      where: { userId },
      data: { streakJours: 0 },
    });
  }

  async findTrendingBooks(limit = 3) {
    return this.prisma.book.findMany({
      where: { status: BookStatus.PUBLISHED },
      orderBy: [
        { nbEmprunts: "desc" },
        { nbVues: "desc" },
        { noteMoyenne: "desc" },
      ],
      take: limit,
      select: {
        id: true,
        titre: true,
        categorie: true,
      },
    });
  }

  async findUsersForNewsletter() {
    return this.prisma.user.findMany({
      where: { status: UserStatus.ACTIVE },
      select: {
        id: true,
        email: true,
        whatsappNumber: true,
        stats: {
          select: {
            categoriesFavorites: true,
          },
        },
      },
    });
  }

  async findAuthorsForPayouts() {
    return this.prisma.authorProfile.findMany({
      where: {
        status: AuthorStatus.APPROVED,
        soldeDisponible: {
          gt: 1000,
        },
        waveAccount: {
          not: null,
        },
      },
      select: {
        id: true,
        userId: true,
        waveAccount: true,
        soldeDisponible: true,
        user: {
          select: {
            email: true,
            whatsappNumber: true,
          },
        },
      },
    });
  }

  async resetAuthorBalance(authorProfileId: string) {
    return this.prisma.authorProfile.update({
      where: { id: authorProfileId },
      data: { soldeDisponible: 0 },
      select: { id: true },
    });
  }
}
