import { NotFoundException } from "@nestjs/common";
import { NotificationChannel, NotificationStatus } from "@prisma/client";
import { NotificationsRepository } from "./notifications.repository";
import { NotificationsService } from "./notifications.service";

describe("NotificationsService", () => {
  const notification = {
    id: "notification-1",
    userId: "user-1",
    channel: NotificationChannel.WHATSAPP,
    status: NotificationStatus.SENT,
    title: "Emprunt confirme",
    message: "Emprunt confirme : Cybersecurite",
    template: "BORROW_CONFIRMED",
    payload: null,
    sentAt: new Date(),
    readAt: null,
    createdAt: new Date(),
  };

  const repository = {
    findUnreadByUser: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    getUserContact: jest.fn(),
  } as unknown as jest.Mocked<NotificationsRepository>;
  const queue = {
    add: jest.fn(),
  };
  const cache = {
    get: jest.fn(),
    set: jest.fn(),
  };
  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(
      repository,
      queue as never,
      cache as never
    );
  });

  it("retourne les notifications non lues", async () => {
    repository.findUnreadByUser.mockResolvedValue([notification]);

    await expect(service.getUnread("user-1")).resolves.toEqual([
      expect.objectContaining({
        id: "notification-1",
        title: "Emprunt confirme",
      }),
    ]);
  });

  it("marque une notification comme lue", async () => {
    repository.markAsRead.mockResolvedValue({ count: 1 } as never);

    await expect(
      service.markAsRead("notification-1", "user-1")
    ).resolves.toEqual({ read: true });
  });

  it("refuse de marquer comme lue une notification introuvable", async () => {
    repository.markAsRead.mockResolvedValue({ count: 0 } as never);

    await expect(
      service.markAsRead("notification-1", "user-1")
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("met a jour les preferences en cache", async () => {
    cache.get.mockResolvedValue(undefined);

    const result = await service.updatePreferences("user-1", { sms: false });

    expect(result.sms).toBe(false);
    expect(result.whatsapp).toBe(true);
    expect(cache.set).toHaveBeenCalledWith(
      "notifications:preferences:user-1",
      result,
      0
    );
  });

  it("ajoute un job WhatsApp avec retry x3", async () => {
    repository.getUserContact.mockResolvedValue({
      id: "user-1",
      email: "awa@example.com",
      whatsappNumber: "+221771234567",
      nom: "Ndiaye",
      prenom: "Awa",
    });

    await service.enqueueWhatsApp("user-1", "BORROW_CONFIRMED", {
      titre: "Cybersecurite",
      jours: 14,
    });

    expect(queue.add).toHaveBeenCalledWith(
      "whatsapp",
      expect.objectContaining({
        userId: "user-1",
        to: "+221771234567",
        template: "BORROW_CONFIRMED",
      }),
      expect.objectContaining({ attempts: 3 })
    );
  });
});
