import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { CACHE_MANAGER, Cache } from "@nestjs/cache-manager";
import { InjectQueue } from "@nestjs/bull";
import { ConfigService } from "@nestjs/config";
import {
  PaymentProvider,
  PaymentType,
  Prisma,
  TransactionStatus,
} from "@prisma/client";
import { Queue } from "bull";
import { randomUUID } from "node:crypto";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PaginationMetaDto } from "../../common/dto/response.dto";
import { NaboopayService } from "./naboopay.service";
import {
  InitiatePaymentDto,
  PaymentInitiationResponseDto,
  TransactionResponseDto,
  WebhookDto,
} from "./dto";
import { PaymentsRepository } from "./payments.repository";

type TransactionRecord = Awaited<
  ReturnType<PaymentsRepository["createPendingTransaction"]>
>;
type PaymentPricing = {
  bookId?: string;
  listingId?: string;
  penaltyId?: string;
  montantTotal: number;
  montantCommission: number;
  montantVendeur: number;
  description: string;
  metadata: Record<string, unknown>;
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  constructor(
    @Inject(PaymentsRepository)
    private readonly paymentsRepository: PaymentsRepository,
    @Inject(NaboopayService)
    private readonly naboopayService: NaboopayService,
    @InjectQueue("payments") private readonly paymentQueue: Queue,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(ConfigService) private readonly configService: ConfigService
  ) {
    const naboopayConfigured = !!this.configService.get("NABOOPAY_API_KEY") || !!this.configService.get("naboopay.apiKey");

    if (naboopayConfigured) {
      this.logger.log("✅ Paiements configurés avec Naboopay");
    } else {
      this.logger.warn("⚠️ Aucun provider de paiement configuré - mode désactivé");
    }
  }

  async initiatePayment(
    userId: string,
    dto: InitiatePaymentDto
  ): Promise<PaymentInitiationResponseDto> {
    const pricing = await this.calculatePricing(userId, dto);
    const transactionId = randomUUID();
    const transaction = await this.paymentsRepository.createPendingTransaction({
      id: transactionId,
      externalId: transactionId,
      userId,
      bookId: pricing.bookId,
      listingId: pricing.listingId,
      penaltyId: pricing.penaltyId,
      type: dto.type,
      provider: PaymentProvider.NABOOPAY,
      status: TransactionStatus.PENDING,
      montantTotal: pricing.montantTotal,
      montantCommission: pricing.montantCommission,
      montantVendeur: pricing.montantVendeur,
      currency: "XOF",
      metadata: pricing.metadata as Prisma.InputJsonValue,
    });

    const { paymentUrl, orderId } = await this.naboopayService.createPayment({
      transactionId: transaction.externalId ?? transaction.id,
      amount: transaction.montantTotal,
      currency: transaction.currency,
      description: pricing.description,
    });

    const updatedTransaction = await this.paymentsRepository.updatePaymentData(
      transaction.id,
      paymentUrl,
      orderId
    );

    return {
      transactionId: updatedTransaction.id,
      montantFcfa: updatedTransaction.montantTotal,
      currency: updatedTransaction.currency,
      paymentUrl,
    };
  }

  async handleWebhook(body: WebhookDto, signature?: string) {
    const isValid = this.naboopayService.verifyWebhookSignature(body, signature);

    if (!isValid) {
      throw new UnauthorizedException(`Signature webhook Naboopay invalide`);
    }

    const transactionId = (body as any).order_id || body.merchant_transaction_id || body.transaction_id;
    const isSuccess = body.status === "SUCCESS" || body.status === "success";

    const transaction = await this.paymentsRepository.findByExternalId(transactionId);

    if (!transaction) {
      throw new NotFoundException("Transaction introuvable");
    }

    if (transaction.status === TransactionStatus.COMPLETED) {
      return { received: true, duplicate: true };
    }

    if (isSuccess) {
      const completedTransaction =
        await this.paymentsRepository.completeTransaction(transaction.id);
      await this.paymentQueue.add(
        "payment.success",
        {
          transactionId: completedTransaction.id,
          userId: completedTransaction.userId,
          type: completedTransaction.type,
          montantTotal: completedTransaction.montantTotal,
        },
        { attempts: 3, backoff: { type: "exponential", delay: 2_000 } }
      );
      await this.cacheManager.del(`payments:history:${transaction.userId}`);

      return { received: true };
    }

    const failedTransaction = await this.paymentsRepository.markFailed(
      transaction.id
    );
    await this.paymentQueue.add(
      "payment.failed",
      {
        transactionId: failedTransaction.id,
        userId: failedTransaction.userId,
        type: failedTransaction.type,
      },
      { attempts: 3, backoff: { type: "exponential", delay: 2_000 } }
    );

    return { received: true };
  }

  async getHistory(userId: string, pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      this.paymentsRepository.findHistoryByUser(
        userId,
        skip,
        limit,
        pagination.cursor
      ),
      this.paymentsRepository.countHistoryByUser(userId),
    ]);

    return {
      data: transactions.map(transaction =>
        this.toTransactionResponse(transaction)
      ),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        nextCursor:
          transactions.length === limit
            ? transactions[transactions.length - 1].id
            : undefined,
      } satisfies PaginationMetaDto,
    };
  }

  async initiatePenaltyPayment(userId: string, penaltyId: string) {
    return this.initiatePayment(userId, {
      type: PaymentType.PENALTY,
      penaltyId,
    });
  }

  async initiateSubscription(userId: string) {
    return this.initiatePayment(userId, {
      type: PaymentType.SUBSCRIPTION,
      durationDays: 30,
    });
  }

  async initiateWalletRecharge(userId: string) {
    return this.initiatePayment(userId, {
      type: PaymentType.WALLET_RECHARGE,
    });
  }

  private async calculatePricing(
    userId: string,
    dto: InitiatePaymentDto
  ): Promise<PaymentPricing> {
    switch (dto.type) {
      case PaymentType.BORROW:
        return this.calculateBorrowPricing(dto);
      case PaymentType.BUY:
        return this.calculateBuyPricing(dto);
      case PaymentType.SUBSCRIPTION:
        return {
          montantTotal: 2000,
          montantCommission: 0,
          montantVendeur: 0,
          description: "Abonnement illimite BiblioTech - 30 jours",
          metadata: { plan: "premium", durationDays: 30 },
        };
      case PaymentType.PENALTY:
        return this.calculatePenaltyPricing(userId, dto);
      case PaymentType.MARKETPLACE:
        return this.calculateMarketplacePricing(dto);
      case PaymentType.WALLET_RECHARGE: {
        const COIN_PACKS: Record<string, { coins: number; prixFcfa: number; label: string }> = {
          pack_30:  { coins: 30,  prixFcfa: 300,  label: "Pack Découverte" },
          pack_100: { coins: 100, prixFcfa: 900,  label: "Pack Étudiant" },
          pack_250: { coins: 250, prixFcfa: 2000, label: "Pack Pro" },
          pack_500: { coins: 500, prixFcfa: 3500, label: "Pack Premium" },
        };
        const pack = COIN_PACKS[dto.packId ?? "pack_100"] ?? COIN_PACKS["pack_100"];
        return {
          montantTotal: pack.prixFcfa,
          montantCommission: 0,
          montantVendeur: 0,
          description: `${pack.label} — ${pack.coins} BiblioCoins`,
          metadata: { packId: dto.packId, coins: pack.coins, source: "wallet_recharge" },
        };
      }
      default:
        throw new BadRequestException("Type de paiement non supporte");
    }
  }

  private async calculateBorrowPricing(dto: InitiatePaymentDto) {
    if (!dto.bookId) {
      throw new BadRequestException("bookId requis pour un emprunt");
    }

    const book = await this.paymentsRepository.findBookForPayment(dto.bookId);

    if (!book) {
      throw new NotFoundException("Livre introuvable");
    }

    const durationDays = dto.durationDays ?? 30;
    const montantTotal =
      durationDays === 7 ? book.prixLocation7j : book.prixLocation30j;

    return {
      bookId: book.id,
      montantTotal,
      montantCommission: 0,
      montantVendeur: 0,
      description: `Emprunt ${durationDays}j - ${book.titre}`,
      metadata: { durationDays },
    };
  }

  private async calculateBuyPricing(dto: InitiatePaymentDto) {
    if (!dto.bookId) {
      throw new BadRequestException("bookId requis pour un achat");
    }

    const book = await this.paymentsRepository.findBookForPayment(dto.bookId);

    if (!book) {
      throw new NotFoundException("Livre introuvable");
    }

    return {
      bookId: book.id,
      montantTotal: book.prixAchat,
      montantCommission: 0,
      montantVendeur: 0,
      description: `Achat definitif - ${book.titre}`,
      metadata: { access: "lifetime" },
    };
  }

  private async calculatePenaltyPricing(
    userId: string,
    dto: InitiatePaymentDto
  ) {
    if (!dto.penaltyId) {
      throw new BadRequestException("penaltyId requis pour payer une amende");
    }

    const penalty = await this.paymentsRepository.findPenaltyForPayment(
      dto.penaltyId,
      userId
    );

    if (!penalty) {
      throw new NotFoundException("Amende introuvable ou deja payee");
    }

    return {
      penaltyId: penalty.id,
      montantTotal: penalty.montantFcfa,
      montantCommission: 0,
      montantVendeur: 0,
      description: "Paiement amende BiblioTech",
      metadata: { penaltyId: penalty.id },
    };
  }

  private async calculateMarketplacePricing(dto: InitiatePaymentDto) {
    if (!dto.listingId) {
      throw new BadRequestException(
        "listingId requis pour un achat marketplace"
      );
    }

    const listing = await this.paymentsRepository.findListingForPayment(
      dto.listingId
    );

    if (!listing) {
      throw new NotFoundException("Annonce marketplace introuvable");
    }

    const commissionPct = Number(listing.commissionPct);
    const montantCommission = Math.round(
      (listing.prixAffiche * commissionPct) / 100
    );
    const montantVendeur = listing.prixAffiche - montantCommission;

    return {
      listingId: listing.id,
      bookId: listing.bookId,
      montantTotal: listing.prixAffiche,
      montantCommission,
      montantVendeur,
      description: "Achat marketplace BiblioTech",
      metadata: {
        sellerId: listing.sellerId,
        commissionPct,
      },
    };
  }

  private toTransactionResponse(
    transaction: TransactionRecord
  ): TransactionResponseDto {
    return {
      id: transaction.id,
      type: transaction.type,
      provider: transaction.provider,
      status: transaction.status,
      montantTotal: transaction.montantTotal,
      montantCommission: transaction.montantCommission,
      montantVendeur: transaction.montantVendeur,
      currency: transaction.currency,
      paymentUrl: transaction.paymentUrl,
      paidAt: transaction.paidAt,
      createdAt: transaction.createdAt,
    };
  }
}
