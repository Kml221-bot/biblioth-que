import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { MarketplaceStatus } from "@prisma/client";
import { MarketplaceService } from "./marketplace.service";
import { MarketplaceRepository } from "./marketplace.repository";

describe("MarketplaceService", () => {
  let service: MarketplaceService;
  let repository: jest.Mocked<MarketplaceRepository>;

  const mockListing = {
    id: "listing-1",
    titre: "Livre Python",
    description: "Excellent etat",
    prixAffiche: 1500,
    commissionPct: { toNumber: () => 15 } as any,
    status: MarketplaceStatus.ACTIVE,
    soldAt: null,
    createdAt: new Date(),
    sellerId: "user-1",
    bookId: "book-1",
    seller: { id: "user-1", nom: "Kane", prenom: "Mouha" },
    book: {
      id: "book-1",
      titre: "Python pour tous",
      auteur: "Guido",
      coverUrl: null,
    },
  };

  beforeEach(() => {
    repository = {
      findActiveListings: jest.fn(),
      countActiveListings: jest.fn(),
      findByUser: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      archive: jest.fn(),
      findMessages: jest.fn(),
      createMessage: jest.fn(),
      markMessagesAsRead: jest.fn(),
    } as unknown as jest.Mocked<MarketplaceRepository>;

    service = new MarketplaceService(repository);
  });

  describe("create", () => {
    it("devrait creer une annonce", async () => {
      repository.create.mockResolvedValue(mockListing);

      const result = await service.create("user-1", {
        bookId: "book-1",
        titre: "Livre Python",
        prixAffiche: 1500,
      });

      expect(result.id).toBe("listing-1");
      expect(result.prixAffiche).toBe(1500);
    });
  });

  describe("update", () => {
    it("devrait modifier une annonce du proprietaire", async () => {
      repository.findById.mockResolvedValue(mockListing);
      repository.update.mockResolvedValue({
        ...mockListing,
        prixAffiche: 2000,
      });

      const result = await service.update("listing-1", "user-1", {
        prixAffiche: 2000,
      });

      expect(result.prixAffiche).toBe(2000);
    });

    it("devrait interdire la modification par un non-proprietaire", async () => {
      repository.findById.mockResolvedValue(mockListing);

      await expect(
        service.update("listing-1", "user-999", { prixAffiche: 2000 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("devrait interdire la modification d'une annonce non active", async () => {
      repository.findById.mockResolvedValue({
        ...mockListing,
        status: MarketplaceStatus.SOLD,
      });

      await expect(
        service.update("listing-1", "user-1", { prixAffiche: 2000 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("findOne", () => {
    it("devrait retourner une annonce existante", async () => {
      repository.findById.mockResolvedValue(mockListing);

      const result = await service.findOne("listing-1");
      expect(result.titre).toBe("Livre Python");
    });

    it("devrait lever NotFoundException si annonce introuvable", async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne("unknown")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("archive", () => {
    it("devrait archiver une annonce du proprietaire", async () => {
      repository.findById.mockResolvedValue(mockListing);
      repository.archive.mockResolvedValue({
        ...mockListing,
        status: MarketplaceStatus.ARCHIVED,
      });

      const result = await service.archive("listing-1", "user-1");
      expect(result.status).toBe(MarketplaceStatus.ARCHIVED);
    });
  });
});
