import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

const reviewSelect = {
  id: true,
  note: true,
  commentaire: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  user: {
    select: { id: true, nom: true, prenom: true, avatarUrl: true },
  },
} satisfies Prisma.BookReviewSelect;

@Injectable()
export class ReviewsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Trouver la review d'un utilisateur pour un livre */
  async findByUserAndBook(userId: string, bookId: string) {
    return this.prisma.bookReview.findUnique({
      where: { userId_bookId: { userId, bookId } },
      select: reviewSelect,
    });
  }

  /** Lister les reviews d'un livre */
  async findByBook(bookId: string, skip: number, take: number) {
    return this.prisma.bookReview.findMany({
      where: { bookId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: reviewSelect,
    });
  }

  /** Compter les reviews d'un livre */
  async countByBook(bookId: string) {
    return this.prisma.bookReview.count({ where: { bookId } });
  }

  /** Creer une review */
  async create(data: Prisma.BookReviewUncheckedCreateInput) {
    return this.prisma.bookReview.create({
      data,
      select: reviewSelect,
    });
  }

  /** Mettre a jour une review */
  async update(id: string, data: Prisma.BookReviewUpdateInput) {
    return this.prisma.bookReview.update({
      where: { id },
      data,
      select: reviewSelect,
    });
  }

  /** Supprimer une review */
  async delete(id: string) {
    return this.prisma.bookReview.delete({ where: { id } });
  }

  /** Calculer la note moyenne + distribution des etoiles */
  async getBookRating(bookId: string) {
    const [aggregate, distribution] = await Promise.all([
      this.prisma.bookReview.aggregate({
        where: { bookId },
        _avg: { note: true },
        _count: { note: true },
      }),
      this.prisma.bookReview.groupBy({
        by: ["note"],
        where: { bookId },
        _count: { note: true },
        orderBy: { note: "asc" },
      }),
    ]);

    const dist: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    for (const row of distribution) {
      dist[String(row.note)] = row._count.note;
    }

    return {
      noteMoyenne: Math.round((aggregate._avg.note ?? 0) * 10) / 10,
      totalReviews: aggregate._count.note,
      distribution: dist,
    };
  }

  /** Mettre a jour la note moyenne sur le livre */
  async updateBookAverage(bookId: string, noteMoyenne: number) {
    return this.prisma.book.update({
      where: { id: bookId },
      data: { noteMoyenne },
    });
  }
}
