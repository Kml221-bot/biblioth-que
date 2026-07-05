import { GamificationService } from "./gamification.service";
import { GamificationRepository } from "./gamification.repository";
import { Queue } from "bull";

describe("GamificationService", () => {
  let service: GamificationService;
  let repository: jest.Mocked<GamificationRepository>;
  let notificationsQueue: jest.Mocked<Queue>;

  beforeEach(() => {
    repository = {
      userHasBadge: jest.fn(),
      awardBadge: jest.fn(),
      countReturnedBooks: jest.fn(),
      countReturnedByCategory: jest.fn(),
      getUserStreak: jest.fn(),
      countReferrals: jest.fn(),
      hasPremium: jest.fn(),
      countNotes: jest.fn(),
      countOwnedCommunities: jest.fn(),
      countReviews: jest.fn(),
      getUserBadges: jest.fn(),
    } as unknown as jest.Mocked<GamificationRepository>;

    notificationsQueue = {
      add: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<Queue>;

    service = new GamificationService(repository, notificationsQueue);
  });

  describe("checkAfterBorrow", () => {
    it("devrait attribuer FIRST_BORROW si pas encore obtenu", async () => {
      repository.userHasBadge.mockResolvedValue(false);
      repository.awardBadge.mockResolvedValue({
        id: "badge-1",
        code: "FIRST_BORROW",
        nom: "Premier emprunt",
        description: "test",
        type: "READING",
      });

      await service.checkAfterBorrow("user-1");

      expect(repository.awardBadge).toHaveBeenCalledWith(
        "user-1",
        "FIRST_BORROW",
      );
      expect(notificationsQueue.add).toHaveBeenCalledWith(
        "whatsapp",
        expect.objectContaining({ template: "BADGE_UNLOCKED" }),
        expect.any(Object),
      );
    });

    it("devrait ne rien faire si badge deja obtenu", async () => {
      repository.userHasBadge.mockResolvedValue(true);

      await service.checkAfterBorrow("user-1");

      expect(repository.awardBadge).not.toHaveBeenCalled();
    });
  });

  describe("checkAfterReturn", () => {
    it("devrait attribuer BOOK_5 apres 5 retours", async () => {
      repository.userHasBadge.mockResolvedValue(false);
      repository.countReturnedBooks.mockResolvedValue(5);
      repository.countReturnedByCategory.mockResolvedValue(2);
      repository.awardBadge.mockResolvedValue({
        id: "badge-2",
        code: "BOOK_5",
        nom: "Lecteur assidu",
        description: "test",
        type: "READING",
      });

      await service.checkAfterReturn("user-1", "Informatique");

      expect(repository.awardBadge).toHaveBeenCalledWith("user-1", "BOOK_5");
    });

    it("devrait attribuer CYBER_READER apres 5 livres Informatique", async () => {
      repository.userHasBadge.mockResolvedValue(false);
      repository.countReturnedBooks.mockResolvedValue(5);
      repository.countReturnedByCategory.mockResolvedValue(5);
      repository.awardBadge.mockResolvedValue({
        id: "badge-3",
        code: "CYBER_READER",
        nom: "Lecteur Cyber",
        description: "test",
        type: "READING",
      });

      await service.checkAfterReturn("user-1", "Informatique");

      expect(repository.awardBadge).toHaveBeenCalledWith(
        "user-1",
        "CYBER_READER",
      );
    });
  });

  describe("checkStreakBadges", () => {
    it("devrait attribuer STREAK_7 apres 7 jours", async () => {
      repository.getUserStreak.mockResolvedValue(7);
      repository.userHasBadge.mockResolvedValue(false);
      repository.awardBadge.mockResolvedValue({
        id: "badge-4",
        code: "STREAK_7",
        nom: "Semaine de feu",
        description: "test",
        type: "STREAK",
      });

      await service.checkStreakBadges("user-1");

      expect(repository.awardBadge).toHaveBeenCalledWith("user-1", "STREAK_7");
    });
  });

  describe("getUserBadges", () => {
    it("devrait retourner les badges de l'utilisateur", async () => {
      repository.getUserBadges.mockResolvedValue([
        {
          earnedAt: new Date(),
          badge: {
            id: "b1",
            code: "FIRST_BORROW",
            nom: "Premier emprunt",
            description: "test",
            type: "READING",
          },
        },
      ]);

      const badges = await service.getUserBadges("user-1");

      expect(badges).toHaveLength(1);
      expect(badges[0].code).toBe("FIRST_BORROW");
    });
  });
});
