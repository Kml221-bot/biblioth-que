import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  PaymentProvider,
  PaymentType,
  TransactionStatus,
} from "@prisma/client";
import { createHmac } from "node:crypto";
import { NaboopayService, NaboopayWebhookPayload } from "./naboopay.service";
import { PaymentsRepository } from "./payments.repository";
import { PaymentsService } from "./payments.service";

describe("NaboopayService", () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        "naboopay.apiKey": "api-key-test",
        "naboopay.merchantId": "merchant-id-test",
      };

      return values[key];
    }),
    get: jest.fn((key: string) => {
      if (key === "naboopay.webhookSecret") return "secret-test";
      return undefined;
    }),
  } as unknown as ConfigService;

  const service = new NaboopayService(configService);

  it("verifie une signature HMAC-SHA256 valide", () => {
    const body: NaboopayWebhookPayload = {
      transaction_id: "trx-123",
      merchant_transaction_id: "transaction-1",
      amount: 2000,
      currency: "XOF",
      status: "SUCCESS",
      payment_method: "WAVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const payload = JSON.stringify(body);
    const signature = createHmac("sha256", "secret-test")
      .update(payload)
      .digest("hex");

    expect(service.verifyWebhookSignature(body, signature)).toBe(true);
  });

  it("refuse une signature invalide", () => {
    const body: NaboopayWebhookPayload = {
      transaction_id: "trx-123",
      merchant_transaction_id: "transaction-1",
      amount: 2000,
      currency: "XOF",
      status: "SUCCESS",
      payment_method: "WAVE",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    expect(service.verifyWebhookSignature(body, "bad-signature")).toBe(false);
  });
});

describe("PaymentsService.handleWebhook", () => {
  const transaction = {
    id: "transaction-1",
    userId: "user-1",
    bookId: null,
    listingId: null,
    penaltyId: null,
    subscriptionId: null,
    type: PaymentType.SUBSCRIPTION,
    provider: PaymentProvider.WAVE,
    status: TransactionStatus.PENDING,
    montantTotal: 2000,
    montantCommission: 0,
    montantVendeur: 0,
    currency: "XOF",
    externalId: "transaction-1",
    paymentUrl: null,
    metadata: null,
    paidAt: null,
    createdAt: new Date(),
  };

  const repository = {
    findByExternalId: jest.fn(),
    completeTransaction: jest.fn(),
    markFailed: jest.fn(),
  } as unknown as jest.Mocked<PaymentsRepository>;
  const naboopayService = {
    verifyWebhookSignature: jest.fn(),
  } as unknown as jest.Mocked<NaboopayService>;
  const queue = {
    add: jest.fn(),
  };
  const cache = {
    del: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  } as unknown as jest.Mocked<ConfigService>;
  
  let service: PaymentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentsService(
      repository,
      naboopayService,
      queue as never,
      cache as never,
      configService
    );
  });

  it("rejette le webhook si la signature HMAC est invalide", async () => {
    naboopayService.verifyWebhookSignature.mockReturnValue(false);

    await expect(
      service.handleWebhook(
        {
          transaction_id: "trx-123",
          merchant_transaction_id: "transaction-1",
          amount: 2000,
          currency: "XOF",
          status: "SUCCESS",
          payment_method: "WAVE",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any,
        "bad-signature"
      )
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("marque la transaction completed et ajoute un job asynchrone si status est SUCCESS", async () => {
    naboopayService.verifyWebhookSignature.mockReturnValue(true);
    repository.findByExternalId.mockResolvedValue(transaction);
    repository.completeTransaction.mockResolvedValue({
      ...transaction,
      status: TransactionStatus.COMPLETED,
      paidAt: new Date(),
    });

    await service.handleWebhook(
      {
        transaction_id: "trx-123",
        merchant_transaction_id: "transaction-1",
        amount: 2000,
        currency: "XOF",
        status: "SUCCESS",
        payment_method: "WAVE",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any,
      "valid-signature"
    );

    expect(repository.completeTransaction).toHaveBeenCalledWith(
      "transaction-1"
    );
    expect(queue.add).toHaveBeenCalledWith(
      "payment.success",
      expect.objectContaining({ transactionId: "transaction-1" }),
      expect.any(Object)
    );
  });
});
