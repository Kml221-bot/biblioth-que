import { InjectQueue } from "@nestjs/bull";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Queue } from "bull";
import { NaboopayService } from "../payments/naboopay.service";
import { calculerAmende } from "../borrows/utils/penalty.util";
import { SchedulerRepository } from "./scheduler.repository";

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @Inject(SchedulerRepository)
    private readonly schedulerRepository: SchedulerRepository,
    @Inject(NaboopayService)
    private readonly naboopayService: NaboopayService,
    @InjectQueue("notifications") private readonly notificationsQueue: Queue,
  ) {}

  /**
   * Chaque nuit a 00h00 — Verifier les emprunts en retard
   * J-3 : rappel WhatsApp + Email
   * J-1 : rappel SMS urgent
   * J+1 a J+7 : amende 300F
   * J+8 a J+14 : amende 500F + SMS
   * J+15+ : amende 800F + suspension compte
   */
  @Cron("0 0 * * *", { name: "check-overdue-borrows" })
  async checkOverdueBorrows() {
    const borrows =
      await this.schedulerRepository.findActiveBorrowsForOverdueCheck();
    const now = new Date();
    let processed = 0;
    let errors = 0;

    for (const borrow of borrows) {
      try {
        const daysUntilDue = this.daysBetween(now, borrow.finPrevue);
        const joursRetard = this.daysLate(borrow.finPrevue, now);

        // J-3 avant echeance : rappel WhatsApp + Email
        if (daysUntilDue === 3 && !borrow.rappelJ3Envoye) {
          await this.enqueueNotification("whatsapp", {
            userId: borrow.userId,
            to: borrow.user.whatsappNumber,
            template: "BORROW_REMINDER_3",
            vars: { titre: borrow.book.titre },
          });
          await this.enqueueNotification("email", {
            userId: borrow.userId,
            to: borrow.user.email,
            template: "borrow_confirmed",
            data: {
              title: "Rappel emprunt J-3",
              message: `${borrow.book.titre} expire dans 3 jours.`,
            },
          });
          await this.schedulerRepository.markReminderJ3Sent(borrow.id);
        }

        // J-1 avant echeance : rappel SMS urgent
        if (daysUntilDue === 1 && !borrow.rappelJ1Envoye) {
          await this.enqueueNotification("sms", {
            userId: borrow.userId,
            to: borrow.user.whatsappNumber?.replace("whatsapp:", ""),
            message: `${borrow.book.titre} doit etre retourne demain.`,
          });
          await this.schedulerRepository.markReminderJ1Sent(borrow.id);
        }

        // En retard : creer/mettre a jour l'amende
        if (joursRetard > 0) {
          const montantFcfa = calculerAmende(joursRetard);
          await this.schedulerRepository.upsertPenaltyAndMarkOverdue({
            borrowId: borrow.id,
            userId: borrow.userId,
            joursRetard,
            montantFcfa,
          });
          await this.enqueueNotification("whatsapp", {
            userId: borrow.userId,
            to: borrow.user.whatsappNumber,
            template: "OVERDUE_WARNING",
            vars: {
              titre: borrow.book.titre,
              jours: joursRetard,
              montant: montantFcfa,
            },
          });
        }

        // J+8 et plus : alerte SMS supplementaire
        if (joursRetard >= 8) {
          await this.enqueueNotification("sms", {
            userId: borrow.userId,
            to: borrow.user.whatsappNumber?.replace("whatsapp:", ""),
            message: `Retard ${joursRetard}j. Amende ${calculerAmende(joursRetard)}F.`,
          });
        }

        // J+15 et plus : suspension du compte
        if (joursRetard >= 15) {
          await this.schedulerRepository.suspendUser(borrow.userId);
          await this.enqueueNotification("email", {
            userId: borrow.userId,
            to: borrow.user.email,
            template: "overdue_notice",
            data: {
              title: "Compte suspendu temporairement",
              message: `Ton compte est suspendu apres ${joursRetard} jours de retard.`,
            },
          });
        }

        processed++;
      } catch (error) {
        errors++;
        this.logger.error(
          `Erreur traitement emprunt borrowId=${borrow.id}: ${error instanceof Error ? error.message : error}`,
        );
        // On continue avec le prochain emprunt au lieu de tout arreter
      }
    }

    this.logger.log(
      `check-overdue-borrows termine: ${processed} traites, ${errors} erreurs sur ${borrows.length} emprunts`,
    );
  }

  /**
   * 1er du mois a 08h00 — Reset mensuel
   * - Reset quotas free a 3 emprunts
   * - Renouveler les abonnements auto_renew
   * - Envoyer les stats mensuelles par email
   * - Reset streak si aucune lecture
   */
  @Cron("0 8 1 * *", { name: "monthly-reset" })
  async monthlyReset() {
    await this.schedulerRepository.resetFreeQuotas();

    // Renouvellement des abonnements auto_renew
    const autoRenewSubscriptions =
      await this.schedulerRepository.findAutoRenewSubscriptions();
    const nextMonth = this.addDays(new Date(), 30);

    for (const subscription of autoRenewSubscriptions) {
      try {
        await this.schedulerRepository.extendSubscription(
          subscription.id,
          nextMonth,
        );
      } catch (error) {
        this.logger.error(
          `Erreur renouvellement abonnement subscriptionId=${subscription.id}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    // Calcul et envoi des stats mensuelles — mois precedent
    const monthStart = new Date();
    monthStart.setMonth(monthStart.getMonth() - 1);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const users =
      await this.schedulerRepository.findUsersForMonthlyStats(monthStart);
    let emailsSent = 0;

    for (const user of users) {
      try {
        const livres = new Set(
          user.readingSessions.map((session) => session.bookId),
        ).size;
        const minutes = user.readingSessions.reduce(
          (sum, session) => sum + session.dureeMinutes,
          0,
        );
        const pages = user.readingSessions.reduce((sum, session) => {
          const pageFin = session.pageFin ?? session.pageDebut;
          return sum + Math.max(0, pageFin - session.pageDebut + 1);
        }, 0);

        if (user.readingSessions.length === 0) {
          await this.schedulerRepository.resetStreakIfNoReading(user.id);
        }

        await this.enqueueNotification("email", {
          userId: user.id,
          to: user.email,
          template: "monthly_stats",
          data: {
            title: "Ton mois sur BiblioTech",
            message: `Ce mois tu as lu ${livres} livres, ${pages} pages, ${minutes} minutes.`,
          },
        });
        emailsSent++;
      } catch (error) {
        this.logger.error(
          `Erreur stats mensuelles userId=${user.id}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    this.logger.log(
      `monthly-reset termine: ${emailsSent} rapports envoyes sur ${users.length} utilisateurs`,
    );
  }

  /**
   * Tous les dimanches a 10h00 — Newsletter hebdomadaire
   * Selection de 3 livres tendance, personnalises par categorie favorite
   */
  @Cron("0 10 * * 0", { name: "weekly-newsletter" })
  async weeklyNewsletter() {
    const [books, users] = await Promise.all([
      this.schedulerRepository.findTrendingBooks(3),
      this.schedulerRepository.findUsersForNewsletter(),
    ]);
    const selection = books.map((book) => book.titre).join(", ");
    let sent = 0;

    for (const user of users) {
      try {
        const favorite = user.stats?.categoriesFavorites?.[0];
        const message = favorite
          ? `La Selection BiblioTech: ${selection}. Ta categorie favorite: ${favorite}.`
          : `La Selection BiblioTech de la semaine: ${selection}.`;

        await this.enqueueNotification("whatsapp", {
          userId: user.id,
          to: user.whatsappNumber,
          template: "WEEKLY_NEWSLETTER",
          vars: { titre: message },
        });
        await this.enqueueNotification("email", {
          userId: user.id,
          to: user.email,
          template: "weekly_newsletter",
          data: {
            title: "La Selection BiblioTech de la semaine",
            message,
          },
        });
        sent++;
      } catch (error) {
        this.logger.error(
          `Erreur newsletter userId=${user.id}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    this.logger.log(
      `weekly-newsletter termine: ${sent} envoyes sur ${users.length} utilisateurs`,
    );
  }

  /**
   * 1er du mois a 09h00 — Versements auteurs
   * Initier les virements Wave pour les auteurs avec solde > 1000 FCFA
   */
  @Cron("0 9 1 * *", { name: "author-payouts" })
  async authorPayouts() {
    const authors = await this.schedulerRepository.findAuthorsForPayouts();
    let paid = 0;

    for (const author of authors) {
      try {
        if (!author.waveAccount) {
          this.logger.warn(
            `Auteur sans compte Wave authorId=${author.id}, versement ignore`,
          );
          continue;
        }

        await this.naboopayService.initiatePayout(
          author.waveAccount,
          author.soldeDisponible,
        );
        await this.schedulerRepository.resetAuthorBalance(author.id);
        await this.enqueueNotification("whatsapp", {
          userId: author.userId,
          to: author.user.whatsappNumber,
          template: "PAYMENT_SUCCESS",
          vars: { montant: author.soldeDisponible },
        });
        await this.enqueueNotification("email", {
          userId: author.userId,
          to: author.user.email,
          template: "payment_receipt",
          data: {
            title: "Versement auteur initie",
            message: `Versement Wave initie: ${author.soldeDisponible} FCFA.`,
          },
        });
        paid++;
      } catch (error) {
        this.logger.error(
          `Erreur versement auteur authorId=${author.id}: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    this.logger.log(
      `author-payouts termine: ${paid} payes sur ${authors.length} auteurs`,
    );
  }

  /** Envoyer une notification dans la queue Bull si le destinataire existe */
  private async enqueueNotification(
    jobName: string,
    payload: Record<string, unknown>,
  ) {
    const hasRecipient = Boolean(payload.to);

    if (!hasRecipient) {
      this.logger.debug(
        `Notification ${jobName} ignoree: pas de destinataire pour userId=${payload.userId}`,
      );
      return;
    }

    await this.notificationsQueue.add(jobName, payload, {
      attempts: 3,
      backoff: { type: "exponential", delay: 2_000 },
    });
  }

  private daysBetween(from: Date, to: Date) {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(0, 0, 0, 0);

    return Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  private daysLate(expected: Date, actual: Date) {
    return Math.max(0, -this.daysBetween(actual, expected));
  }

  private addDays(date: Date, days: number) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);

    return copy;
  }
}
