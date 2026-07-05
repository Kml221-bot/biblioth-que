import { Inject, Injectable } from "@nestjs/common";
import {
  BookStatus,
  BorrowStatus,
  PaymentProvider,
  PaymentType,
  PenaltyStatus,
  Prisma,
  SubscriptionPlan,
  SubscriptionStatus,
  TransactionStatus,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

export const borrowSelect = {
  id: true,
  userId: true,
  bookId: true,
  statut: true,
  debut: true,
  finPrevue: true,
  finReelle: true,
  dureeJours: true,
  pageActuelle: true,
  pourcentageLu: true,
  nbRenouvellements: true,
  book: {
    select: {
      id: true,
      titre: true,
      auteur: true,
      categorie: true,
      typeAcces: true,
      coverUrl: true,
    },
  },
  penalties: {
    where: { status: PenaltyStatus.PENDING },
    select: {
      id: true,
      montantFcfa: true,
      joursRetard: true,
      status: true,
    },
  },
} satisfies Prisma.BorrowSelect;

@Injectable()
export class BorrowsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findPublishedBook(bookId: string) {
    return this.prisma.book.findFirst({
      where: {
        id: bookId,
        status: BookStatus.PUBLISHED,
      },
      select: {
        id: true,
        titre: true,
        typeAcces: true,
        prixLocation7j: true,
        prixLocation30j: true,
      },
    });
  }

  async findActiveBorrowByUserAndBook(userId: string, bookId: string) {
    return this.prisma.borrow.findFirst({
      where: {
        userId,
        bookId,
        statut: {
          in: [
            BorrowStatus.ACTIVE,
            BorrowStatus.OVERDUE,
            BorrowStatus.RENEWAL_PENDING,
          ],
        },
      },
      select: { id: true },
    });
  }

  async findById(id: string) {
    return this.prisma.borrow.findUnique({
      where: { id },
      select: borrowSelect,
    });
  }

  async findActiveByUser(userId: string) {
    return this.prisma.borrow.findMany({
      where: {
        userId,
        statut: {
          in: [
            BorrowStatus.ACTIVE,
            BorrowStatus.OVERDUE,
            BorrowStatus.RENEWAL_PENDING,
          ],
        },
      },
      orderBy: { finPrevue: "asc" },
      select: borrowSelect,
    });
  }

  async findHistoryByUser(
    userId: string,
    skip: number,
    take: number,
    cursor?: string
  ) {
    return this.prisma.borrow.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: cursor ? 1 : skip,
      take,
      cursor: cursor ? { id: cursor } : undefined,
      select: borrowSelect,
    });
  }

  async countHistoryByUser(userId: string) {
    return this.prisma.borrow.count({
      where: { userId },
    });
  }

  async findOverdueBorrows() {
    return this.prisma.borrow.findMany({
      where: {
        OR: [
          { statut: BorrowStatus.OVERDUE },
          {
            statut: BorrowStatus.ACTIVE,
            finPrevue: { lt: new Date() },
          },
        ],
      },
      orderBy: { finPrevue: "asc" },
      select: borrowSelect,
    });
  }

  async countActiveBorrows(userId: string) {
    return this.prisma.borrow.count({
      where: {
        userId,
        statut: {
          in: [
            BorrowStatus.ACTIVE,
            BorrowStatus.OVERDUE,
            BorrowStatus.RENEWAL_PENDING,
          ],
        },
      },
    });
  }

  async getActiveSubscription(userId: string) {
    return this.prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        plan: true,
        empruntsRestants: true,
      },
    });
  }

  async createBorrowWithQuota(params: {
    userId: string;
    bookId: string;
    dureeJours: number;
    finPrevue: Date;
    decrementFreeQuota: boolean;
  }) {
    return this.prisma.$transaction(async tx => {
      if (params.decrementFreeQuota) {
        const subscription = await tx.subscription.findFirst({
          where: {
            userId: params.userId,
            status: SubscriptionStatus.ACTIVE,
            plan: SubscriptionPlan.FREE,
          },
          orderBy: { createdAt: "desc" },
          select: { id: true, empruntsRestants: true },
        });

        if (!subscription || subscription.empruntsRestants <= 0) {
          throw new Error("QUOTA_EXHAUSTED");
        }

        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            empruntsRestants: {
              decrement: 1,
            },
          },
        });
      }

      const borrow = await tx.borrow.create({
        data: {
          userId: params.userId,
          bookId: params.bookId,
          dureeJours: params.dureeJours,
          finPrevue: params.finPrevue,
        },
        select: borrowSelect,
      });

      await tx.book.update({
        where: { id: params.bookId },
        data: {
          nbEmprunts: {
            increment: 1,
          },
        },
      });

      return borrow;
    });
  }

  async createRenewalPayment(params: {
    borrowId: string;
    userId: string;
    bookId: string;
    dureeJours: number;
    montantFcfa: number;
  }) {
    return this.prisma.$transaction(async tx => {
      await tx.borrow.update({
        where: { id: params.borrowId },
        data: { statut: BorrowStatus.RENEWAL_PENDING },
      });

      return tx.transaction.create({
        data: {
          userId: params.userId,
          bookId: params.bookId,
          type: PaymentType.RENEWAL,
          provider: PaymentProvider.WAVE,
          status: TransactionStatus.PENDING,
          montantTotal: params.montantFcfa,
          metadata: {
            borrowId: params.borrowId,
            dureeJours: params.dureeJours,
          },
        },
        select: {
          id: true,
          montantTotal: true,
          status: true,
        },
      });
    });
  }

  async returnBorrow(params: {
    borrowId: string;
    joursRetard: number;
    montantAmende: number;
  }) {
    return this.prisma.$transaction(async tx => {
      if (params.joursRetard > 0 && params.montantAmende > 0) {
        const existingPenalty = await tx.penalty.findFirst({
          where: {
            borrowId: params.borrowId,
            status: PenaltyStatus.PENDING,
          },
          select: { id: true },
        });

        if (existingPenalty) {
          await tx.penalty.update({
            where: { id: existingPenalty.id },
            data: {
              joursRetard: params.joursRetard,
              montantFcfa: params.montantAmende,
            },
          });
        } else {
          const borrow = await tx.borrow.findUniqueOrThrow({
            where: { id: params.borrowId },
            select: { userId: true },
          });

          await tx.penalty.create({
            data: {
              userId: borrow.userId,
              borrowId: params.borrowId,
              joursRetard: params.joursRetard,
              montantFcfa: params.montantAmende,
              reason: "Retard de retour du livre",
            },
          });
        }
      }

      return tx.borrow.update({
        where: { id: params.borrowId },
        data: {
          statut: BorrowStatus.RETURNED,
          finReelle: new Date(),
        },
        select: borrowSelect,
      });
    });
  }

  async updateProgress(params: {
    borrowId: string;
    userId: string;
    bookId: string;
    pageActuelle: number;
    pourcentageLu: number;
    dureeMinutes: number;
  }) {
    return this.prisma.$transaction(async tx => {
      await tx.readingSession.create({
        data: {
          userId: params.userId,
          bookId: params.bookId,
          borrowId: params.borrowId,
          pageDebut: params.pageActuelle,
          pageFin: params.pageActuelle,
          pourcentageLu: params.pourcentageLu,
          dureeMinutes: params.dureeMinutes,
        },
      });

      return tx.borrow.update({
        where: { id: params.borrowId },
        data: {
          pageActuelle: params.pageActuelle,
          pourcentageLu: params.pourcentageLu,
        },
        select: borrowSelect,
      });
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
}
