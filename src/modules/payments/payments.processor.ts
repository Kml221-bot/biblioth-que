import { Process, Processor } from "@nestjs/bull";
import { Inject, Logger } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { Job } from "bull";
import { Queue } from "bull";
import { CoinTransactionType, PaymentType, SubscriptionStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

/** Processeur Bull pour les jobs de paiement confirme/echoue */
@Processor("payments")
export class PaymentsProcessor {
  private readonly logger = new Logger(PaymentsProcessor.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @InjectQueue("notifications") private readonly notificationsQueue: Queue,
  ) {}

  /** Traitement apres un paiement reussi — notifications + stats */
  @Process("payment.success")
  async handlePaymentSuccess(job: Job) {
    const { transactionId, userId, type, montantTotal } = job.data;
    this.logger.log(
      `Traitement paiement reussi transactionId=${transactionId} userId=${userId} type=${type}`,
    );

    try {
      // Recuperer les infos utilisateur pour les notifications
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, whatsappNumber: true },
      });

      if (!user) {
        this.logger.warn(`Utilisateur introuvable userId=${userId}`);
        return;
      }

      // Notification WhatsApp de confirmation
      if (user.whatsappNumber) {
        await this.notificationsQueue.add(
          "whatsapp",
          {
            userId,
            to: user.whatsappNumber,
            template: "PAYMENT_SUCCESS",
            vars: { montant: montantTotal },
          },
          { attempts: 3, backoff: { type: "exponential", delay: 2_000 } },
        );
      }

      // Notification Email de recu
      if (user.email) {
        await this.notificationsQueue.add(
          "email",
          {
            userId,
            to: user.email,
            template: "payment_receipt",
            data: {
              title: "Paiement BiblioTech confirme",
              message: `Ton paiement de ${montantTotal} FCFA a ete confirme.`,
            },
          },
          { attempts: 3, backoff: { type: "exponential", delay: 2_000 } },
        );
      }

      // Activer l'abonnement si paiement de type SUBSCRIPTION
      if (type === PaymentType.SUBSCRIPTION) {
        // Vérifier qu'il n'y a pas déjà un abonnement actif
        const existingActive = await this.prisma.subscription.findFirst({
          where: { userId, status: SubscriptionStatus.ACTIVE },
        });

        if (!existingActive) {
          const now = new Date();
          const endsAt = new Date(now);
          endsAt.setDate(endsAt.getDate() + 30);

          await this.prisma.subscription.create({
            data: {
              userId,
              plan: "STUDENT",
              status: SubscriptionStatus.ACTIVE,
              autoRenew: false,
              startsAt: now,
              endsAt,
            },
          });
          this.logger.log(`Abonnement activé userId=${userId} — expire le ${endsAt.toISOString()}`);

          // Notification de bienvenue
          if (user.whatsappNumber) {
            await this.notificationsQueue.add(
              "whatsapp",
              {
                userId,
                to: user.whatsappNumber,
                template: "SUBSCRIPTION_ACTIVE",
                vars: { montant: montantTotal },
              },
              { attempts: 3, backoff: { type: "exponential", delay: 2_000 } },
            );
          }
        } else {
          this.logger.warn(`Abonnement déjà actif pour userId=${userId} — pas de doublon créé`);
        }
      }

      // Créditer les BiblioCoins si rechargement wallet
      if (type === PaymentType.WALLET_RECHARGE) {
        const transaction = await this.prisma.transaction.findUnique({
          where: { id: transactionId },
          select: { metadata: true },
        });
        const coins = (transaction?.metadata as Record<string, unknown>)?.coins as number ?? 0;
        if (coins > 0) {
          const updated = await this.prisma.user.update({
            where: { id: userId },
            data: { coinBalance: { increment: coins } },
            select: { coinBalance: true },
          });
          await this.prisma.coinTransaction.create({
            data: {
              userId,
              type: CoinTransactionType.PURCHASE,
              amount: coins,
              balanceAfter: updated.coinBalance,
              description: `Achat Wave/Orange Money — ${coins} BiblioCoins (${montantTotal} FCFA)`,
            },
          });
          this.logger.log(`${coins} BiblioCoins crédités userId=${userId}`);
          // Notification WhatsApp de créditement
          if (user.whatsappNumber) {
            await this.notificationsQueue.add(
              "whatsapp",
              {
                userId,
                to: user.whatsappNumber,
                template: "COINS_CREDITED",
                vars: { coins, montant: montantTotal },
              },
              { attempts: 3, backoff: { type: "exponential", delay: 2_000 } },
            );
          }
        }
      }

      // Mise a jour des statistiques utilisateur
      if (type === PaymentType.BUY || type === PaymentType.BORROW) {
        await this.prisma.userStats.upsert({
          where: { userId },
          create: { userId },
          update: {},
        });
      }

      this.logger.log(
        `Paiement traite avec succes transactionId=${transactionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erreur traitement paiement transactionId=${transactionId}: ${error instanceof Error ? error.message : error}`,
      );
      throw error; // Bull va retenter automatiquement
    }
  }

  /** Traitement apres un paiement echoue — notification d'echec */
  @Process("payment.failed")
  async handlePaymentFailed(job: Job) {
    const { transactionId, userId, type } = job.data;
    this.logger.warn(
      `Paiement echoue transactionId=${transactionId} userId=${userId} type=${type}`,
    );

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, whatsappNumber: true },
      });

      if (!user) return;

      // Notification email d'echec
      if (user.email) {
        await this.notificationsQueue.add(
          "email",
          {
            userId,
            to: user.email,
            template: "payment_receipt",
            data: {
              title: "Echec de paiement BiblioTech",
              message:
                "Ton paiement n'a pas abouti. Reessaie ou contacte le support.",
            },
          },
          { attempts: 3, backoff: { type: "exponential", delay: 2_000 } },
        );
      }

      // Notification WhatsApp d'echec
      if (user.whatsappNumber) {
        await this.notificationsQueue.add(
          "whatsapp",
          {
            userId,
            to: user.whatsappNumber,
            template: "PAYMENT_SUCCESS",
            vars: { montant: "echec - reessaie" },
          },
          { attempts: 3, backoff: { type: "exponential", delay: 2_000 } },
        );
      }
    } catch (error) {
      // On ne relance pas pour un echec de notification sur un paiement deja echoue
      this.logger.error(
        `Erreur notification echec paiement transactionId=${transactionId}: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
