import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateChapterDto, UpdateChapterDto } from "./dto";

@Injectable()
export class ChaptersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllByBook(bookId: string, userId?: string) {
    return this.prisma.chapter.findMany({
      where: { bookId },
      orderBy: { ordre: "asc" },
      include: {
        accesses: userId
          ? { where: { userId }, select: { id: true } }
          : false,
      },
    });
  }

  findOne(id: string) {
    return this.prisma.chapter.findUnique({
      where: { id },
      include: { book: { select: { id: true, freeChaptersCount: true } } },
    });
  }

  create(bookId: string, dto: CreateChapterDto) {
    return this.prisma.chapter.create({
      data: { bookId, ...dto },
    });
  }

  update(id: string, dto: UpdateChapterDto) {
    return this.prisma.chapter.update({
      where: { id },
      data: dto,
    });
  }

  delete(id: string) {
    return this.prisma.chapter.delete({ where: { id } });
  }

  findAccess(userId: string, chapterId: string) {
    return this.prisma.userChapterAccess.findUnique({
      where: { userId_chapterId: { userId, chapterId } },
    });
  }

  createAccess(userId: string, chapterId: string, paidPieces: number) {
    return this.prisma.userChapterAccess.create({
      data: { userId, chapterId, paidPieces },
    });
  }

  countBookChapters(bookId: string) {
    return this.prisma.chapter.count({ where: { bookId } });
  }
}
