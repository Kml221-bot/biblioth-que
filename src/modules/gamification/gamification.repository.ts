import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

const badgeSelect = {
  id: true,
  code: true,
  nom: true,
  description: true,
  type: true,
} satisfies Prisma.BadgeSelect;

@Injectable()
export class GamificationRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Verifier si un utilisateur a deja un badge */
  async userHasBadge(userId: string, badgeCode: string) {
    const badge = await this.prisma.badge.findUnique({
      where: { code: badgeCode },
      select: { id: true },
    });

    if (!badge) return false;

    const existing = await this.prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
    });

    return Boolean(existing);
  }

  /** Attribuer un badge a un utilisateur */
  async awardBadge(userId: string, badgeCode: string) {
    const badge = await this.prisma.badge.findUnique({
      where: { code: badgeCode },
      select: badgeSelect,
    });

    if (!badge) return null;

    // Verifier que l'utilisateur n'a pas deja ce badge
    const existing = await this.prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
    });

    if (existing) return null;

    await this.prisma.userBadge.create({
      data: { userId, badgeId: badge.id },
    });

    return badge;
  }

  /** Compter les livres retournes par un utilisateur */
  async countReturnedBooks(userId: string) {
    return this.prisma.borrow.count({
      where: { userId, statut: "RETURNED" },
    });
  }

  /** Compter les livres retournes par categorie */
  async countReturnedByCategory(userId: string, categorie: string) {
    return this.prisma.borrow.count({
      where: {
        userId,
        statut: "RETURNED",
        book: { categorie },
      },
    });
  }

  /** Recuperer le streak de lecture d'un utilisateur */
  async getUserStreak(userId: string) {
    const stats = await this.prisma.userStats.findUnique({
      where: { userId },
      select: { streakJours: true },
    });

    return stats?.streakJours ?? 0;
  }

  /** Compter les parrainages reussis */
  async countReferrals(userId: string) {
    return this.prisma.affiliation.count({
      where: { referrerId: userId },
    });
  }

  /** Verifier si l'utilisateur a un abonnement premium actif */
  async hasPremium(userId: string) {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        userId,
        plan: { not: "FREE" },
        status: "ACTIVE",
      },
    });

    return Boolean(sub);
  }

  /** Compter les notes prises par un utilisateur */
  async countNotes(userId: string) {
    return this.prisma.bookNote.count({ where: { userId } });
  }

  /** Compter les communautes creees */
  async countOwnedCommunities(userId: string) {
    return this.prisma.community.count({ where: { ownerId: userId } });
  }

  /** Compter les reviews */
  async countReviews(userId: string) {
    return this.prisma.bookReview.count({ where: { userId } });
  }

  /** Recuperer tous les badges d'un utilisateur */
  async getUserBadges(userId: string) {
    return this.prisma.userBadge.findMany({
      where: { userId },
      select: {
        unlockedAt: true,
        badge: { select: badgeSelect },
      },
      orderBy: { unlockedAt: "desc" },
    });
  }
}
