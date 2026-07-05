import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { SubscriptionsRepository } from "./subscriptions.repository";
import { SubscriptionsService } from "./subscriptions.service";

describe("SubscriptionsService", () => {
  const activeSubscription = {
    id: "sub-1",
    userId: "user-1",
    plan: SubscriptionPlan.STUDENT,
    status: SubscriptionStatus.ACTIVE,
    empruntsRestants: 5,
    autoRenew: false,
    startsAt: new Date("2026-01-01"),
    endsAt: new Date("2026-02-01"),
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };

  const repository = {
    findActiveByUser: jest.fn(),
    findAllByUser: jest.fn(),
    countByUser: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    cancel: jest.fn(),
    findExpiringSoon: jest.fn(),
  } as unknown as jest.Mocked<SubscriptionsRepository>;

  let service: SubscriptionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SubscriptionsService(repository);
  });

  describe("getCurrentSubscription", () => {
    it("retourne l'abonnement actif quand il existe", async () => {
      repository.findActiveByUser.mockResolvedValue(
        activeSubscription as never,
      );

      const result = await service.getCurrentSubscription("user-1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("sub-1");
      expect(result!.plan).toBe(SubscriptionPlan.STUDENT);
      expect(result!.status).toBe(SubscriptionStatus.ACTIVE);
      expect(repository.findActiveByUser).toHaveBeenCalledWith("user-1");
    });

    it("retourne null quand aucun abonnement actif", async () => {
      repository.findActiveByUser.mockResolvedValue(null as never);

      const result = await service.getCurrentSubscription("user-1");

      expect(result).toBeNull();
    });
  });

  describe("subscribe", () => {
    it("cree un abonnement avec succes", async () => {
      repository.findActiveByUser.mockResolvedValue(null as never);
      repository.create.mockResolvedValue(activeSubscription as never);

      const result = await service.subscribe("user-1", {
        plan: SubscriptionPlan.STUDENT,
        autoRenew: false,
      });

      expect(result.id).toBe("sub-1");
      expect(result.plan).toBe(SubscriptionPlan.STUDENT);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          plan: SubscriptionPlan.STUDENT,
          status: SubscriptionStatus.ACTIVE,
        }),
      );
    });

    it("refuse de creer un doublon si un abonnement actif existe", async () => {
      repository.findActiveByUser.mockResolvedValue(
        activeSubscription as never,
      );

      await expect(
        service.subscribe("user-1", {
          plan: SubscriptionPlan.PREMIUM,
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe("cancel", () => {
    it("annule un abonnement avec succes", async () => {
      repository.findById.mockResolvedValue(activeSubscription as never);
      repository.cancel.mockResolvedValue({
        ...activeSubscription,
        status: SubscriptionStatus.CANCELED,
      } as never);

      const result = await service.cancel("sub-1", "user-1");

      expect(result.status).toBe(SubscriptionStatus.CANCELED);
      expect(repository.cancel).toHaveBeenCalledWith("sub-1");
    });

    it("refuse l'annulation si l'utilisateur n'est pas le proprietaire", async () => {
      repository.findById.mockResolvedValue(activeSubscription as never);

      await expect(
        service.cancel("sub-1", "user-other"),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(repository.cancel).not.toHaveBeenCalled();
    });

    it("leve une erreur si l'abonnement est introuvable", async () => {
      repository.findById.mockResolvedValue(null as never);

      await expect(
        service.cancel("sub-999", "user-1"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
