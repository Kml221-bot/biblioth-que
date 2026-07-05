import { ConflictException, NotFoundException } from "@nestjs/common";
import { ReviewsService } from "./reviews.service";
import { ReviewsRepository } from "./reviews.repository";
import { GamificationService } from "../gamification/gamification.service";

describe("ReviewsService", () => {
  let service: ReviewsService;
  let repository: jest.Mocked<ReviewsRepository>;
  let gamification: jest.Mocked<GamificationService>;

  const mockReview = {
    id: "review-1",
    note: 4,
    commentaire: "Tres bon livre",
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: "user-1",
    user: { id: "user-1", nom: "Kane", prenom: "Mouha", avatarUrl: null },
  };

  beforeEach(() => {
    repository = {
      findByUserAndBook: jest.fn(),
      findByBook: jest.fn(),
      countByBook: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getBookRating: jest.fn(),
      updateBookAverage: jest.fn(),
    } as unknown as jest.Mocked<ReviewsRepository>;

    gamification = {
      checkAfterReview: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<GamificationService>;

    service = new ReviewsService(repository, gamification);
  });

  describe("create", () => {
    it("devrait creer un avis et recalculer la moyenne", async () => {
      repository.findByUserAndBook.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockReview);
      repository.getBookRating.mockResolvedValue({
        noteMoyenne: 4,
        totalReviews: 1,
        distribution: { "1": 0, "2": 0, "3": 0, "4": 1, "5": 0 },
      });
      repository.updateBookAverage.mockResolvedValue(undefined as any);

      const result = await service.create("user-1", "book-1", {
        note: 4,
        commentaire: "Tres bon livre",
      });

      expect(result.note).toBe(4);
      expect(repository.create).toHaveBeenCalled();
      expect(repository.updateBookAverage).toHaveBeenCalledWith("book-1", 4);
      expect(gamification.checkAfterReview).toHaveBeenCalledWith("user-1");
    });

    it("devrait lever ConflictException si avis existant", async () => {
      repository.findByUserAndBook.mockResolvedValue(mockReview);

      await expect(
        service.create("user-1", "book-1", { note: 5 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("update", () => {
    it("devrait modifier un avis existant", async () => {
      repository.findByUserAndBook.mockResolvedValue(mockReview);
      repository.update.mockResolvedValue({ ...mockReview, note: 5 });
      repository.getBookRating.mockResolvedValue({
        noteMoyenne: 5,
        totalReviews: 1,
        distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 1 },
      });
      repository.updateBookAverage.mockResolvedValue(undefined as any);

      const result = await service.update("user-1", "book-1", { note: 5 });

      expect(result.note).toBe(5);
    });

    it("devrait lever NotFoundException si pas d'avis", async () => {
      repository.findByUserAndBook.mockResolvedValue(null);

      await expect(
        service.update("user-1", "book-1", { note: 5 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getBookRating", () => {
    it("devrait retourner la note moyenne et distribution", async () => {
      repository.getBookRating.mockResolvedValue({
        noteMoyenne: 4.2,
        totalReviews: 15,
        distribution: { "1": 0, "2": 1, "3": 2, "4": 5, "5": 7 },
      });

      const result = await service.getBookRating("book-1");

      expect(result.noteMoyenne).toBe(4.2);
      expect(result.totalReviews).toBe(15);
      expect(result.distribution["5"]).toBe(7);
    });
  });

  describe("delete", () => {
    it("devrait supprimer un avis et recalculer la moyenne", async () => {
      repository.findByUserAndBook.mockResolvedValue(mockReview);
      repository.delete.mockResolvedValue(undefined as any);
      repository.getBookRating.mockResolvedValue({
        noteMoyenne: 0,
        totalReviews: 0,
        distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
      });
      repository.updateBookAverage.mockResolvedValue(undefined as any);

      const result = await service.delete("user-1", "book-1");

      expect(result.deleted).toBe(true);
      expect(repository.updateBookAverage).toHaveBeenCalledWith("book-1", 0);
    });
  });
});
