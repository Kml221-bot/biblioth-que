import { Inject, Injectable } from "@nestjs/common";
import {
  BorrowStatus,
  CommunityVisibility,
  PaymentType,
  Prisma,
  TransactionStatus,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

export const noteSelect = {
  id: true,
  userId: true,
  bookId: true,
  sharedWithCommunityId: true,
  page: true,
  type: true,
  contenu: true,
  couleur: true,
  likesCount: true,
  isPublic: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      id: true,
      nom: true,
      prenom: true,
    },
  },
} satisfies Prisma.BookNoteSelect;

@Injectable()
export class NotesRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

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

  async isCommunityMember(userId: string, communityId: string) {
    const member = await this.prisma.communityMember.findUnique({
      where: {
        communityId_userId: {
          communityId,
          userId,
        },
      },
      select: { id: true },
    });

    return Boolean(member);
  }

  async findUserCommunityIds(userId: string) {
    const memberships = await this.prisma.communityMember.findMany({
      where: { userId },
      select: { communityId: true },
    });

    return memberships.map(membership => membership.communityId);
  }

  async create(data: Prisma.BookNoteUncheckedCreateInput) {
    return this.prisma.bookNote.create({
      data,
      select: noteSelect,
    });
  }

  async findOwnedOrVisibleBookNotes(
    userId: string,
    bookId: string,
    communityIds: string[]
  ) {
    return this.prisma.bookNote.findMany({
      where: {
        bookId,
        OR: [
          { userId },
          { isPublic: true },
          {
            sharedWithCommunityId: {
              in: communityIds,
            },
          },
        ],
      },
      orderBy: [{ page: "asc" }, { createdAt: "desc" }],
      select: noteSelect,
    });
  }

  async findCommunityNotes(communityId: string, bookId: string) {
    return this.prisma.bookNote.findMany({
      where: {
        bookId,
        sharedWithCommunityId: communityId,
      },
      orderBy: [{ page: "asc" }, { createdAt: "desc" }],
      select: noteSelect,
    });
  }

  async findById(id: string) {
    return this.prisma.bookNote.findUnique({
      where: { id },
      select: noteSelect,
    });
  }

  async update(id: string, data: Prisma.BookNoteUpdateInput) {
    return this.prisma.bookNote.update({
      where: { id },
      data,
      select: noteSelect,
    });
  }

  async delete(id: string) {
    return this.prisma.bookNote.delete({
      where: { id },
      select: { id: true },
    });
  }

  async toggleLike(noteId: string, userId: string) {
    return this.prisma.$transaction(async tx => {
      const existing = await tx.bookNoteLike.findUnique({
        where: {
          noteId_userId: {
            noteId,
            userId,
          },
        },
        select: { id: true },
      });

      if (existing) {
        await tx.bookNoteLike.delete({ where: { id: existing.id } });
        const note = await tx.bookNote.update({
          where: { id: noteId },
          data: { likesCount: { decrement: 1 } },
          select: { likesCount: true },
        });

        return { liked: false, likesCount: note.likesCount };
      }

      await tx.bookNoteLike.create({
        data: {
          noteId,
          userId,
        },
      });
      const note = await tx.bookNote.update({
        where: { id: noteId },
        data: { likesCount: { increment: 1 } },
        select: { likesCount: true },
      });

      return { liked: true, likesCount: note.likesCount };
    });
  }

  async communityExists(communityId: string) {
    return this.prisma.community.findFirst({
      where: {
        id: communityId,
        visibility: {
          in: [CommunityVisibility.PUBLIC, CommunityVisibility.PRIVATE],
        },
      },
      select: { id: true },
    });
  }
}
