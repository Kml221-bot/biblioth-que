import { Inject, Injectable } from "@nestjs/common";
import {
  BookStatus,
  BorrowStatus,
  PaymentType,
  TransactionStatus,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AiRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findBookContext(bookId: string) {
    return this.prisma.book.findFirst({
      where: {
        id: bookId,
        status: BookStatus.PUBLISHED,
      },
      select: {
        id: true,
        titre: true,
        auteur: true,
        description: true,
        categorie: true,
        filiere: true,
        extraitUrl: true,
        pageTexts: {
          orderBy: { page: "asc" },
          take: 10,
          select: {
            page: true,
            content: true,
          },
        },
      },
    });
  }

  async findBookForIndexing(bookId: string) {
    return this.prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true },
    });
  }

  async findBookFileForExtraction(bookId: string) {
    return this.prisma.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        fileUrl: true,
        extraitUrl: true,
      },
    });
  }

  async replaceBookPageTexts(
    bookId: string,
    pages: Array<{ page: number; content: string }>
  ) {
    return this.prisma.$transaction(async tx => {
      await tx.bookPageText.deleteMany({
        where: { bookId },
      });

      await tx.bookPageText.createMany({
        data: pages.map(page => ({
          bookId,
          page: page.page,
          content: page.content,
        })),
        skipDuplicates: true,
      });

      return tx.bookPageText.count({
        where: { bookId },
      });
    });
  }

  async userHasBookAccess(userId: string, bookId: string) {
    const [borrow, purchase] = await Promise.all([
      this.prisma.borrow.findFirst({
        where: {
          userId,
          bookId,
          statut: {
            in: [
              BorrowStatus.ACTIVE,
              BorrowStatus.OVERDUE,
              BorrowStatus.RETURNED,
            ],
          },
        },
        select: { id: true },
      }),
      this.prisma.transaction.findFirst({
        where: {
          userId,
          bookId,
          status: TransactionStatus.COMPLETED,
          type: { in: [PaymentType.BUY, PaymentType.MARKETPLACE] },
        },
        select: { id: true },
      }),
    ]);

    return Boolean(borrow || purchase);
  }

  async findUserRecommendationProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        stats: {
          select: {
            categoriesFavorites: true,
          },
        },
        borrows: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            book: {
              select: {
                id: true,
                titre: true,
                categorie: true,
              },
            },
          },
        },
      },
    });
  }

  async findAvailableBooksForRecommendations(
    categories: string[],
    excludedBookIds: string[]
  ) {
    return this.prisma.book.findMany({
      where: {
        status: BookStatus.PUBLISHED,
        id: { notIn: excludedBookIds },
        ...(categories.length > 0
          ? {
              OR: categories.map(categorie => ({
                categorie: {
                  contains: categorie,
                  mode: "insensitive" as const,
                },
              })),
            }
          : {}),
      },
      orderBy: [{ nbEmprunts: "desc" }, { noteMoyenne: "desc" }],
      take: 10,
      select: {
        id: true,
        titre: true,
        auteur: true,
        categorie: true,
        description: true,
      },
    });
  }
}
