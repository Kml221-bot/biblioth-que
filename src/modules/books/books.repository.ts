import { Inject, Injectable } from "@nestjs/common";
import {
  BookStatus,
  BorrowStatus,
  PaymentType,
  Prisma,
  TransactionStatus,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

export const bookListSelect = {
  id: true,
  titre: true,
  auteur: true,
  categorie: true,
  filiere: true,
  description: true,
  typeAcces: true,
  status: true,
  prixAchat: true,
  prixLocation7j: true,
  prixLocation30j: true,
  noteMoyenne: true,
  reviewsCount: true,
  nbVues: true,
  nbEmprunts: true,
  featured: true,
  coverUrl: true,
  createdAt: true,
  authorProfile: {
    select: {
      id: true,
      user: {
        select: {
          nom: true,
          prenom: true,
        },
      },
    },
  },
} satisfies Prisma.BookSelect;

export const bookDetailsSelect = {
  ...bookListSelect,
  reviews: {
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      note: true,
      commentaire: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          nom: true,
          prenom: true,
        },
      },
    },
  },
} satisfies Prisma.BookSelect;

@Injectable()
export class BooksRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findManyWithFilters(
    where: Prisma.BookWhereInput,
    orderBy: Prisma.BookOrderByWithRelationInput[],
    skip: number,
    take: number,
    cursor?: string
  ) {
    return this.prisma.book.findMany({
      where,
      orderBy,
      skip: cursor ? 1 : skip,
      take,
      cursor: cursor ? { id: cursor } : undefined,
      select: bookListSelect,
    });
  }

  async count(where: Prisma.BookWhereInput) {
    return this.prisma.book.count({ where });
  }

  async findOneWithDetails(id: string) {
    return this.prisma.book.findFirst({
      where: {
        id,
        status: BookStatus.PUBLISHED,
      },
      select: bookDetailsSelect,
    });
  }

  async findRawById(id: string) {
    return this.prisma.book.findUnique({
      where: { id },
      select: bookListSelect,
    });
  }

  async incrementViews(id: string) {
    return this.prisma.book.updateMany({
      where: { id },
      data: {
        nbVues: {
          increment: 1,
        },
      },
    });
  }

  async create(data: Prisma.BookCreateInput) {
    return this.prisma.book.create({
      data,
      select: bookDetailsSelect,
    });
  }

  async update(id: string, data: Prisma.BookUpdateInput) {
    return this.prisma.book.update({
      where: { id },
      data,
      select: bookDetailsSelect,
    });
  }

  async delete(id: string) {
    return this.prisma.book.delete({
      where: { id },
      select: { id: true },
    });
  }

  async createReview(data: Prisma.BookReviewUncheckedCreateInput) {
    return this.prisma.$transaction(async tx => {
      const review = await tx.bookReview.create({
        data,
        select: {
          id: true,
          note: true,
          commentaire: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              nom: true,
              prenom: true,
            },
          },
        },
      });

      const aggregation = await tx.bookReview.aggregate({
        where: { bookId: data.bookId },
        _avg: { note: true },
        _count: { note: true },
      });

      await tx.book.update({
        where: { id: data.bookId },
        data: {
          noteMoyenne: aggregation._avg.note ?? 0,
          reviewsCount: aggregation._count.note,
        },
      });

      return review;
    });
  }

  async deleteReview(bookId: string, userId: string) {
    return this.prisma.$transaction(async tx => {
      await tx.bookReview.delete({
        where: {
          userId_bookId: {
            userId,
            bookId,
          },
        },
      });

      const aggregation = await tx.bookReview.aggregate({
        where: { bookId },
        _avg: { note: true },
        _count: { note: true },
      });

      await tx.book.update({
        where: { id: bookId },
        data: {
          noteMoyenne: aggregation._avg.note ?? 0,
          reviewsCount: aggregation._count.note,
        },
      });
    });
  }

  async findReviewByUserAndBook(userId: string, bookId: string) {
    return this.prisma.bookReview.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId,
        },
      },
      select: { id: true },
    });
  }

  async findUserBookAccess(userId: string, bookId: string) {
    const [borrow, purchase] = await Promise.all([
      this.prisma.borrow.findFirst({
        where: {
          userId,
          bookId,
          statut: {
            in: [
              BorrowStatus.ACTIVE,
              BorrowStatus.RETURNED,
              BorrowStatus.OVERDUE,
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
          type: {
            in: [PaymentType.BUY, PaymentType.MARKETPLACE],
          },
        },
        select: { id: true },
      }),
    ]);

    return {
      isAlreadyBorrowed: Boolean(borrow),
      isAlreadyPurchased: Boolean(purchase),
      hasAccess: Boolean(borrow || purchase),
    };
  }

  async findUserBookAccessMap(userId: string, bookIds: string[]) {
    const [borrows, purchases] = await Promise.all([
      this.prisma.borrow.findMany({
        where: {
          userId,
          bookId: { in: bookIds },
          statut: {
            in: [
              BorrowStatus.ACTIVE,
              BorrowStatus.RETURNED,
              BorrowStatus.OVERDUE,
            ],
          },
        },
        select: { bookId: true },
      }),
      this.prisma.transaction.findMany({
        where: {
          userId,
          bookId: { in: bookIds },
          status: TransactionStatus.COMPLETED,
          type: {
            in: [PaymentType.BUY, PaymentType.MARKETPLACE],
          },
        },
        select: { bookId: true },
      }),
    ]);

    return {
      borrowedBookIds: new Set(borrows.map(borrow => borrow.bookId)),
      purchasedBookIds: new Set(
        purchases.map(purchase => purchase.bookId).filter(Boolean) as string[]
      ),
    };
  }

  async getCategoriesWithCounters() {
    return this.prisma.book.groupBy({
      by: ["categorie"],
      where: { status: BookStatus.PUBLISHED },
      _count: { categorie: true },
    });
  }
}
