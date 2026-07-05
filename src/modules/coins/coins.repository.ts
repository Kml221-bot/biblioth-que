import { Injectable } from "@nestjs/common";
import { CoinTransactionType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class CoinsRepository {
  constructor(private readonly prisma: PrismaService) {}

  getBalance(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { coinBalance: true },
    });
  }

  getTransactions(userId: string, limit = 20) {
    return this.prisma.coinTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async credit(
    userId: string,
    amount: number,
    type: CoinTransactionType,
    description?: string,
    chapterId?: string
  ) {
    return this.prisma.$transaction(async tx => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { coinBalance: { increment: amount } },
        select: { coinBalance: true },
      });

      await tx.coinTransaction.create({
        data: {
          userId,
          type,
          amount,
          balanceAfter: user.coinBalance,
          description: description ?? null,
          chapterId: chapterId ?? null,
        },
      });

      return user.coinBalance;
    });
  }

  async debit(
    userId: string,
    amount: number,
    type: CoinTransactionType,
    description?: string,
    chapterId?: string
  ) {
    return this.prisma.$transaction(async tx => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { coinBalance: { decrement: amount } },
        select: { coinBalance: true },
      });

      await tx.coinTransaction.create({
        data: {
          userId,
          type,
          amount: -amount,
          balanceAfter: user.coinBalance,
          description: description ?? null,
          chapterId: chapterId ?? null,
        },
      });

      return user.coinBalance;
    });
  }
}
