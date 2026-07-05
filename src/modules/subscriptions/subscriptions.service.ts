import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { SubscriptionStatus } from "@prisma/client";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PaginationMetaDto } from "../../common/dto/response.dto";
import { CreateSubscriptionDto, SubscriptionResponseDto } from "./dto";
import { SubscriptionsRepository } from "./subscriptions.repository";
import { GamificationService } from "../gamification/gamification.service";

/** Type inféré d'un enregistrement de souscription */
type SubscriptionRecord = NonNullable<
  Awaited<ReturnType<SubscriptionsRepository["findById"]>>
>;

@Injectable()
export class SubscriptionsService {
  constructor(
    @Inject(SubscriptionsRepository)
    private readonly subscriptionsRepository: SubscriptionsRepository,
    @Inject(GamificationService)
    private readonly gamificationService: GamificationService,
  ) {}

  /** Récupérer l'abonnement actif de l'utilisateur ou null */
  async getCurrentSubscription(
    userId: string,
  ): Promise<SubscriptionResponseDto | null> {
    const subscription =
      await this.subscriptionsRepository.findActiveByUser(userId);

    if (!subscription) {
      return null;
    }

    return this.toResponse(subscription);
  }

  /** Historique paginé des abonnements de l'utilisateur */
  async getHistory(
    userId: string,
    pagination: PaginationDto,
  ): Promise<{
    data: SubscriptionResponseDto[];
    meta: PaginationMetaDto;
  }> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;

    const [subscriptions, total] = await Promise.all([
      this.subscriptionsRepository.findAllByUser(userId, skip, limit),
      this.subscriptionsRepository.countByUser(userId),
    ]);

    return {
      data: subscriptions.map(sub => this.toResponse(sub)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Souscrire à un nouveau plan (vérifie qu'il n'y a pas de doublon actif) */
  async subscribe(
    userId: string,
    dto: CreateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    // Vérifier qu'il n'y a pas déjà un abonnement actif
    const existing =
      await this.subscriptionsRepository.findActiveByUser(userId);

    if (existing) {
      throw new ConflictException(
        "Vous avez deja un abonnement actif. Annulez-le avant d'en souscrire un nouveau.",
      );
    }

    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setDate(endsAt.getDate() + 30);

    const subscription = await this.subscriptionsRepository.create({
      userId,
      plan: dto.plan,
      status: SubscriptionStatus.ACTIVE,
      autoRenew: dto.autoRenew ?? false,
      startsAt: now,
      endsAt,
    });

    this.checkBadges(userId);

    return this.toResponse(subscription);
  }

  /** Verifier les badges apres souscription (fire-and-forget) */
  private checkBadges(userId: string) {
    this.gamificationService.checkAfterSubscription(userId).catch(() => {});
  }

  /** Annuler un abonnement (vérifie que l'utilisateur en est le propriétaire) */
  async cancel(id: string, userId: string): Promise<SubscriptionResponseDto> {
    const subscription = await this.findOrFail(id);

    if (subscription.userId !== userId) {
      throw new ForbiddenException(
        "Vous ne pouvez annuler que votre propre abonnement.",
      );
    }

    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      throw new ConflictException("Cet abonnement n'est pas actif.");
    }

    const canceled = await this.subscriptionsRepository.cancel(id);

    return this.toResponse(canceled);
  }

  /** Activer/désactiver le renouvellement automatique */
  async toggleAutoRenew(
    id: string,
    userId: string,
  ): Promise<SubscriptionResponseDto> {
    const subscription = await this.findOrFail(id);

    if (subscription.userId !== userId) {
      throw new ForbiddenException(
        "Vous ne pouvez modifier que votre propre abonnement.",
      );
    }

    const updated = await this.subscriptionsRepository.update(id, {
      autoRenew: !subscription.autoRenew,
    });

    return this.toResponse(updated);
  }

  /** Trouver un abonnement ou lever une exception */
  private async findOrFail(id: string): Promise<SubscriptionRecord> {
    const subscription = await this.subscriptionsRepository.findById(id);

    if (!subscription) {
      throw new NotFoundException("Abonnement introuvable");
    }

    return subscription;
  }

  /** Mapper un enregistrement vers le DTO de réponse */
  private toResponse(record: SubscriptionRecord): SubscriptionResponseDto {
    return {
      id: record.id,
      plan: record.plan,
      status: record.status as import("@prisma/client").SubscriptionStatus,
      empruntsRestants: record.empruntsRestants,
      autoRenew: record.autoRenew,
      startsAt: record.startsAt,
      endsAt: record.endsAt,
      createdAt: record.createdAt,
    };
  }
}
