import { Inject, Injectable } from "@nestjs/common";
import {
  BorrowStatus,
  MarketplaceStatus,
  PaymentType,
  PenaltyStatus,
  Prisma,
  SubscriptionPlan,
  SubscriptionStatus,
  TransactionStatus,
} from "@prisma/client";
import { addDays } from "../borrows/utils/penalty.util";
import { PrismaService } from "../../prisma/prisma.service";

export const transactionSelect = {
  id: true,
  userId: true,
  bookId: true,
  listingId: true,
  penaltyId: true,
  subscriptionId: true,
  type: true,
  provider: true,
  status: true,
  montantTotal: true,
  montantCommission: true,
  montantVendeur: true,
  currency: true,
  externalId: true,
  paymentUrl: true,
  metadata: true,
  paidAt: true,
  createdAt: true,
} satisfies Prisma.TransactionSelect;

@Injectable()
export class PaymentsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findBookForPayment(bookId: string) {
    return this.prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        titre: true,
        prixAchat: true,
        prixLocation7j: true,
        prixLocation30j: true,
      },
    });
  }

  async findPenaltyForPayment(penaltyId: string, userId: string) {
    return this.prisma.penalty.findFirst({
      where: {
        id: penaltyId,
        userId,
        status: PenaltyStatus.PENDING,
      },
      select: {
        id: true,
        montantFcfa: true,
      },
    });
  }

  async findListingForPayment(listingId: string) {
    return this.prisma.marketplaceListing.findFirst({
      where: {
        id: listingId,
        status: MarketplaceStatus.ACTIVE,
      },
      select: {
        id: true,
        bookId: true,
        sellerId: true,
        prixAffiche: true,
        commissionPct: true,
      },
    });
  }

  async createPendingTransaction(data: Prisma.TransactionUncheckedCreateInput) {
    return this.prisma.transaction.create({
      data,
      select: transactionSelect,
    });
  }

  async updatePaymentData(transactionId: string, paymentUrl: string, externalId?: string) {
    return this.prisma.transaction.update({
      where: { id: transactionId },
      data: { paymentUrl, ...(externalId ? { externalId } : {}) },
      select: transactionSelect,
    });
  }

  async findByExternalId(externalId: string) {
    return this.prisma.transaction.findUnique({
      where: { externalId },
      select: transactionSelect,
    });
  }

  async findHistoryByUser(
    userId: string,
    skip: number,
    take: number,
    cursor?: string
  ) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: cursor ? 1 : skip,
      take,
      cursor: cursor ? { id: cursor } : undefined,
      select: transactionSelect,
    });
  }

  async countHistoryByUser(userId: string) {
    return this.prisma.transaction.count({
      where: { userId },
    });
  }

  async markFailed(transactionId: string) {
    return this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status: TransactionStatus.FAILED },
      select: transactionSelect,
    });
  }

  async completeTransaction(transactionId: string) {
    return this.prisma.$transaction(async tx => {
      const transaction = await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.COMPLETED,
          paidAt: new Date(),
        },
        select: transactionSelect,
      });

      if (transaction.type === PaymentType.PENALTY && transaction.penaltyId) {
        await tx.penalty.update({
          where: { id: transaction.penaltyId },
          data: {
            status: PenaltyStatus.PAID,
            paidAt: new Date(),
          },
        });
      }

      if (transaction.type === PaymentType.SUBSCRIPTION) {
        await tx.subscription.create({
          data: {
            userId: transaction.userId,
            plan: SubscriptionPlan.PREMIUM,
            status: SubscriptionStatus.ACTIVE,
            empruntsRestants: 999_999,
            autoRenew: true,
            startsAt: new Date(),
            endsAt: addDays(new Date(), 30),
          },
        });
      }

      if (
        transaction.type === PaymentType.MARKETPLACE &&
        transaction.listingId
      ) {
        await tx.marketplaceListing.update({
          where: { id: transaction.listingId },
          data: {
            status: MarketplaceStatus.SOLD,
            buyerId: transaction.userId,
            soldAt: new Date(),
          },
        });
      }

      if (
        transaction.type === PaymentType.RENEWAL &&
        transaction.metadata &&
        typeof transaction.metadata === "object"
      ) {
        const metadata = transaction.metadata as {
          borrowId?: string;
          dureeJours?: number;
        };

        if (metadata.borrowId && metadata.dureeJours) {
          const borrow = await tx.borrow.findUnique({
            where: { id: metadata.borrowId },
            select: { finPrevue: true },
          });

          if (borrow) {
            await tx.borrow.update({
              where: { id: metadata.borrowId },
              data: {
                statut: BorrowStatus.ACTIVE,
                finPrevue: addDays(borrow.finPrevue, metadata.dureeJours),
                nbRenouvellements: {
                  increment: 1,
                },
              },
            });
          }
        }
      }

      return transaction;
    });
  }
}
