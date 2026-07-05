import { NaboopayService } from "../payments/naboopay.service";
import { SchedulerRepository } from "./scheduler.repository";
import { SchedulerService } from "./scheduler.service";

describe("SchedulerService", () => {
  const now = new Date("2026-05-26T00:00:00.000Z");
  const repository = {
    findActiveBorrowsForOverdueCheck: jest.fn(),
    markReminderJ3Sent: jest.fn(),
    markReminderJ1Sent: jest.fn(),
    upsertPenaltyAndMarkOverdue: jest.fn(),
    suspendUser: jest.fn(),
    resetFreeQuotas: jest.fn(),
    findAutoRenewSubscriptions: jest.fn(),
    extendSubscription: jest.fn(),
    findUsersForMonthlyStats: jest.fn(),
    resetStreakIfNoReading: jest.fn(),
    findTrendingBooks: jest.fn(),
    findUsersForNewsletter: jest.fn(),
    findAuthorsForPayouts: jest.fn(),
    resetAuthorBalance: jest.fn(),
  } as unknown as jest.Mocked<SchedulerRepository>;
  const naboopayService = {
    initiatePayout: jest.fn(),
  } as unknown as jest.Mocked<NaboopayService>;
  const queue = {
    add: jest.fn(),
  };
  let service: SchedulerService;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    jest.clearAllMocks();
    service = new SchedulerService(repository, naboopayService, queue as never);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("envoie les rappels J-3 et marque le rappel envoye", async () => {
    repository.findActiveBorrowsForOverdueCheck.mockResolvedValue([
      {
        id: "borrow-1",
        userId: "user-1",
        finPrevue: new Date("2026-05-29T12:00:00.000Z"),
        rappelJ3Envoye: false,
        rappelJ1Envoye: false,
        user: {
          id: "user-1",
          email: "awa@example.com",
          whatsappNumber: "+221771234567",
        },
        book: { titre: "Cybersecurite" },
      },
    ] as never);

    await service.checkOverdueBorrows();

    expect(queue.add).toHaveBeenCalledWith(
      "whatsapp",
      expect.objectContaining({ template: "BORROW_REMINDER_3" }),
      expect.any(Object)
    );
    expect(queue.add).toHaveBeenCalledWith(
      "email",
      expect.objectContaining({ template: "borrow_confirmed" }),
      expect.any(Object)
    );
    expect(repository.markReminderJ3Sent).toHaveBeenCalledWith("borrow-1");
  });

  it("cree ou met a jour une amende et suspend a J+15", async () => {
    repository.findActiveBorrowsForOverdueCheck.mockResolvedValue([
      {
        id: "borrow-1",
        userId: "user-1",
        finPrevue: new Date("2026-05-10T12:00:00.000Z"),
        rappelJ3Envoye: true,
        rappelJ1Envoye: true,
        user: {
          id: "user-1",
          email: "awa@example.com",
          whatsappNumber: "+221771234567",
        },
        book: { titre: "Cybersecurite" },
      },
    ] as never);

    await service.checkOverdueBorrows();

    expect(repository.upsertPenaltyAndMarkOverdue).toHaveBeenCalledWith(
      expect.objectContaining({
        borrowId: "borrow-1",
        montantFcfa: 800,
      })
    );
    expect(repository.suspendUser).toHaveBeenCalledWith("user-1");
  });

  it("reset les quotas free et envoie les stats mensuelles", async () => {
    repository.findAutoRenewSubscriptions.mockResolvedValue([]);
    repository.findUsersForMonthlyStats.mockResolvedValue([
      {
        id: "user-1",
        email: "awa@example.com",
        nom: "Ndiaye",
        readingSessions: [
          {
            bookId: "book-1",
            pageDebut: 1,
            pageFin: 10,
            dureeMinutes: 25,
          },
        ],
      },
    ] as never);

    await service.monthlyReset();

    expect(repository.resetFreeQuotas).toHaveBeenCalled();
    expect(queue.add).toHaveBeenCalledWith(
      "email",
      expect.objectContaining({ template: "monthly_stats" }),
      expect.any(Object)
    );
  });

  it("initie les versements auteurs puis remet le solde a zero", async () => {
    repository.findAuthorsForPayouts.mockResolvedValue([
      {
        id: "author-1",
        userId: "user-1",
        waveAccount: "+221771234567",
        soldeDisponible: 2500,
        user: {
          email: "auteur@example.com",
          whatsappNumber: "+221771234567",
        },
      },
    ] as never);

    await service.authorPayouts();

    expect(naboopayService.initiatePayout).toHaveBeenCalledWith(
      "+221771234567",
      2500
    );
    expect(repository.resetAuthorBalance).toHaveBeenCalledWith("author-1");
  });
});
