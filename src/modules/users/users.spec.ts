import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { UserRole, UserStatus } from "@prisma/client";
import { UsersService } from "./users.service";
import { UsersRepository } from "./users.repository";

describe("UsersService", () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;

  const mockUser = {
    id: "user-1",
    email: "test@test.sn",
    nom: "Kane",
    prenom: "Mouhamadou",
    role: UserRole.STUDENT,
    status: UserStatus.ACTIVE,
    whatsappNumber: "+221770001122",
    avatarUrl: null,
    referralCode: "ABC12345",
    createdAt: new Date(),
    lastLoginAt: null,
    subscriptions: [],
    stats: null,
    _count: { borrows: 2, penalties: 0 },
  };

  beforeEach(() => {
    repository = {
      findMany: jest.fn(),
      count: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      suspend: jest.fn(),
      reactivate: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;

    service = new UsersService(repository);
  });

  describe("findOne", () => {
    it("devrait retourner le detail d'un utilisateur existant", async () => {
      repository.findById.mockResolvedValue(mockUser);

      const result = await service.findOne("user-1");

      expect(result.id).toBe("user-1");
      expect(result.nom).toBe("Kane");
      expect(result.activeBorrowsCount).toBe(2);
    });

    it("devrait lever NotFoundException si utilisateur introuvable", async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne("unknown")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("suspend", () => {
    it("devrait suspendre un utilisateur actif", async () => {
      repository.findById.mockResolvedValue(mockUser);
      repository.suspend.mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });

      const result = await service.suspend("user-1");

      expect(result.status).toBe(UserStatus.SUSPENDED);
      expect(repository.suspend).toHaveBeenCalledWith("user-1");
    });

    it("devrait interdire la suspension d'un SUPER_ADMIN", async () => {
      repository.findById.mockResolvedValue({
        ...mockUser,
        role: UserRole.SUPER_ADMIN,
      });

      await expect(service.suspend("user-1")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("devrait interdire de suspendre un utilisateur deja suspendu", async () => {
      repository.findById.mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });

      await expect(service.suspend("user-1")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("reactivate", () => {
    it("devrait reactiver un utilisateur suspendu", async () => {
      repository.findById.mockResolvedValue({
        ...mockUser,
        status: UserStatus.SUSPENDED,
      });
      repository.reactivate.mockResolvedValue(mockUser);

      const result = await service.reactivate("user-1");

      expect(result.status).toBe(UserStatus.ACTIVE);
    });

    it("devrait refuser si utilisateur non suspendu", async () => {
      repository.findById.mockResolvedValue(mockUser);

      await expect(service.reactivate("user-1")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
