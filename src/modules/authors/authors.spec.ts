import {
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { AuthorStatus } from "@prisma/client";
import { AuthorsService } from "./authors.service";
import { AuthorsRepository } from "./authors.repository";

describe("AuthorsService", () => {
  let service: AuthorsService;
  let repository: jest.Mocked<AuthorsRepository>;

  const mockAuthor = {
    id: "author-1",
    userId: "user-1",
    bio: "Auteur senegalais",
    status: AuthorStatus.PENDING,
    waveAccount: "+221770001122",
    soldeDisponible: 0,
    commissionPct: { toNumber: () => 70 } as any,
    approvedAt: null,
    createdAt: new Date(),
    user: { nom: "Kane", prenom: "Mouhamadou", email: "test@test.sn" },
    _count: { books: 3 },
  };

  beforeEach(() => {
    repository = {
      findByUserId: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
    } as unknown as jest.Mocked<AuthorsRepository>;

    service = new AuthorsService(repository);
  });

  describe("createProfile", () => {
    it("devrait creer un profil auteur si inexistant", async () => {
      repository.findByUserId.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockAuthor);

      const result = await service.createProfile("user-1", {
        bio: "Auteur senegalais",
      });

      expect(result.id).toBe("author-1");
      expect(result.status).toBe(AuthorStatus.PENDING);
      expect(repository.create).toHaveBeenCalled();
    });

    it("devrait lever ConflictException si profil existe deja", async () => {
      repository.findByUserId.mockResolvedValue(mockAuthor);

      await expect(
        service.createProfile("user-1", { bio: "test" }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("approve", () => {
    it("devrait approuver un auteur en attente", async () => {
      repository.findById.mockResolvedValue(mockAuthor);
      repository.approve.mockResolvedValue({
        ...mockAuthor,
        status: AuthorStatus.APPROVED,
        approvedAt: new Date(),
      });

      const result = await service.approve("author-1");

      expect(result.status).toBe(AuthorStatus.APPROVED);
    });

    it("devrait lever ConflictException si deja approuve", async () => {
      repository.findById.mockResolvedValue({
        ...mockAuthor,
        status: AuthorStatus.APPROVED,
      });

      await expect(service.approve("author-1")).rejects.toThrow(
        ConflictException,
      );
    });

    it("devrait lever NotFoundException si auteur introuvable", async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.approve("unknown")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getMyProfile", () => {
    it("devrait retourner null si pas de profil auteur", async () => {
      repository.findByUserId.mockResolvedValue(null);

      const result = await service.getMyProfile("user-1");

      expect(result).toBeNull();
    });

    it("devrait retourner le profil auteur existant", async () => {
      repository.findByUserId.mockResolvedValue(mockAuthor);

      const result = await service.getMyProfile("user-1");

      expect(result?.id).toBe("author-1");
      expect(result?.booksCount).toBe(3);
    });
  });
});
