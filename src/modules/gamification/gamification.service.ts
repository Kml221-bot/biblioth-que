import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import { GamificationRepository } from "./gamification.repository";

/** Conditions d'attribution des badges par code */
type BadgeCondition = {
  code: string;
  check: (userId: string) => Promise<boolean>;
};

/**
 * Service de gamification — Gere l'attribution automatique des badges
 *
 * Utilisation depuis les autres services :
 *   await this.gamificationService.checkAfterBorrow(userId);
 *   await this.gamificationService.checkAfterReturn(userId, categorie);
 */
@Injectable()
export class GamificationService {
  private readonly logger = new Logger(GamificationService.name);

  constructor(
    @Inject(GamificationRepository)
    private readonly gamificationRepository: GamificationRepository,
    @InjectQueue("notifications") private readonly notificationsQueue: Queue,
  ) {}

  /** Verifier les badges apres un PREMIER emprunt */
  async checkAfterBorrow(userId: string) {
    await this.tryAward(userId, "FIRST_BORROW", async () => {
      const count =
        await this.gamificationRepository.countReturnedBooks(userId);
      // Le badge FIRST_BORROW est attribue des le premier emprunt (pas retour)
      return true;
    });
  }

  /** Verifier les badges apres un RETOUR de livre */
  async checkAfterReturn(userId: string, bookCategorie: string) {
    const returnedCount =
      await this.gamificationRepository.countReturnedBooks(userId);

    // Badges par palier de livres retournes
    const milestones: [number, string][] = [
      [5, "BOOK_5"],
      [10, "BOOK_10"],
      [25, "BOOK_25"],
      [50, "BOOK_50"],
    ];

    for (const [threshold, code] of milestones) {
      if (returnedCount >= threshold) {
        await this.tryAward(userId, code, async () => true);
      }
    }

    // Badges par categorie (5 livres dans la meme categorie)
    const categoryBadges: Record<string, string> = {
      Informatique: "CYBER_READER",
      "Developpement Personnel": "DEV_PERSO_FAN",
      "Litterature Africaine": "LITTERATURE_AFRICAINE",
    };

    const categoryBadge = categoryBadges[bookCategorie];
    if (categoryBadge) {
      const categoryCount =
        await this.gamificationRepository.countReturnedByCategory(
          userId,
          bookCategorie,
        );
      if (categoryCount >= 5) {
        await this.tryAward(userId, categoryBadge, async () => true);
      }
    }
  }

  /** Verifier les badges de streak (appele par le scheduler) */
  async checkStreakBadges(userId: string) {
    const streak = await this.gamificationRepository.getUserStreak(userId);

    if (streak >= 7) {
      await this.tryAward(userId, "STREAK_7", async () => true);
    }

    if (streak >= 30) {
      await this.tryAward(userId, "STREAK_30", async () => true);
    }
  }

  /** Verifier les badges sociaux apres creation de communaute */
  async checkAfterCommunityCreation(userId: string) {
    await this.tryAward(userId, "COMMUNITY_CREATOR", async () => {
      const count =
        await this.gamificationRepository.countOwnedCommunities(userId);
      return count >= 1;
    });
  }

  /** Verifier les badges apres une premiere note */
  async checkAfterNote(userId: string) {
    await this.tryAward(userId, "FIRST_NOTE", async () => {
      const count = await this.gamificationRepository.countNotes(userId);
      return count >= 1;
    });
  }

  /** Verifier les badges apres une review */
  async checkAfterReview(userId: string) {
    await this.tryAward(userId, "FIRST_REVIEW", async () => {
      const count = await this.gamificationRepository.countReviews(userId);
      return count >= 1;
    });
  }

  /** Verifier les badges apres souscription premium */
  async checkAfterSubscription(userId: string) {
    await this.tryAward(userId, "PREMIUM_MEMBER", async () => {
      return this.gamificationRepository.hasPremium(userId);
    });
  }

  /** Verifier les badges de parrainage */
  async checkReferralBadges(userId: string) {
    const count = await this.gamificationRepository.countReferrals(userId);

    if (count >= 3) {
      await this.tryAward(userId, "REFERRAL_3", async () => true);
    }
  }

  /** Recuperer les badges d'un utilisateur */
  async getUserBadges(userId: string) {
    const badges = await this.gamificationRepository.getUserBadges(userId);

    return badges.map((ub) => ({
      code: ub.badge.code,
      nom: ub.badge.nom,
      description: ub.badge.description,
      type: ub.badge.type,
      unlockedAt: ub.unlockedAt,
    }));
  }

  /**
   * Tenter d'attribuer un badge — verifie la condition,
   * verifie que l'utilisateur ne l'a pas deja, et envoie une notification
   */
  private async tryAward(
    userId: string,
    badgeCode: string,
    condition: () => Promise<boolean>,
  ) {
    try {
      // Verification rapide : deja attribue ?
      const alreadyHas = await this.gamificationRepository.userHasBadge(
        userId,
        badgeCode,
      );

      if (alreadyHas) return;

      // Verifier la condition
      const eligible = await condition();
      if (!eligible) return;

      // Attribuer le badge
      const badge = await this.gamificationRepository.awardBadge(
        userId,
        badgeCode,
      );

      if (!badge) return;

      this.logger.log(
        `🏆 Badge ${badge.code} attribue a userId=${userId}: ${badge.nom}`,
      );

      // Notification WhatsApp + in-app
      await this.notificationsQueue.add(
        "whatsapp",
        {
          userId,
          template: "BADGE_UNLOCKED",
          vars: { nom: badge.nom },
        },
        { attempts: 3, backoff: { type: "exponential", delay: 2_000 } },
      );
    } catch (error) {
      // Ne jamais bloquer le flow principal pour un badge
      this.logger.warn(
        `Erreur attribution badge ${badgeCode} userId=${userId}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
