import { Inject, Injectable } from "@nestjs/common";
import { Prisma, SubscriptionStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

/** Champs sélectionnés pour les requêtes de souscription */
export const subscriptionSelect = {
  id: true,
  userId: true,
  plan: true,
  status: true,
  empruntsRestants: true,
  autoRenew: true,
  startsAt: true,
  endsAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SubscriptionSelect;

@Injectable()
export class SubscriptionsRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  /** Trouver l'abonnement actif le plus récent d'un utilisateur */
  async findActiveByUser(userId: string) {
    return this.prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
      orderBy: { createdAt: "desc" },
      select: subscriptionSelect,
    });
  }

  /** Lister les abonnements d'un utilisateur avec pagination */
  async findAllByUser(userId: string, skip: number, take: number) {
    return this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: subscriptionSelect,
    });
  }

  /** Compter les abonnements d'un utilisateur */
  async countByUser(userId: string) {
    return this.prisma.subscription.count({
      where: { userId },
    });
  }

  /** Trouver un abonnement par son identifiant */
  async findById(id: string) {
    return this.prisma.subscription.findUnique({
      where: { id },
      select: subscriptionSelect,
    });
  }

  /** Créer un nouvel abonnement */
  async create(data: Prisma.SubscriptionUncheckedCreateInput) {
    return this.prisma.subscription.create({
      data,
      select: subscriptionSelect,
    });
  }

  /** Mettre à jour un abonnement */
  async update(id: string, data: Prisma.SubscriptionUpdateInput) {
    return this.prisma.subscription.update({
      where: { id },
      data,
      select: subscriptionSelect,
    });
  }

  /** Annuler un abonnement (passer le statut à CANCELED) */
  async cancel(id: string) {
    return this.prisma.subscription.update({
      where: { id },
      data: { status: SubscriptionStatus.CANCELED },
      select: subscriptionSelect,
    });
  }

  /** Trouver les abonnements qui expirent dans les X prochains jours */
  async findExpiringSoon(daysBeforeExpiry: number) {
    const now = new Date();
    const deadline = new Date();
    deadline.setDate(now.getDate() + daysBeforeExpiry);

    return this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endsAt: {
          gte: now,
          lte: deadline,
        },
      },
      select: subscriptionSelect,
    });
  }
}
