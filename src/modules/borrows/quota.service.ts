import { Inject, Injectable } from "@nestjs/common";
import { SubscriptionPlan } from "@prisma/client";
import { BorrowsRepository } from "./borrows.repository";

export type QuotaDecision = {
  allowed: boolean;
  reason?: string;
  plan: SubscriptionPlan;
  decrementFreeQuota: boolean;
};

@Injectable()
export class QuotaService {
  constructor(@Inject(BorrowsRepository) private readonly borrowsRepository: BorrowsRepository) {}

  async canBorrow(userId: string): Promise<QuotaDecision> {
    const subscription =
      await this.borrowsRepository.getActiveSubscription(userId);

    if (!subscription) {
      return {
        allowed: false,
        reason: "Aucun abonnement actif",
        plan: SubscriptionPlan.FREE,
        decrementFreeQuota: false,
      };
    }

    if (subscription.plan !== SubscriptionPlan.FREE) {
      return {
        allowed: true,
        plan: subscription.plan,
        decrementFreeQuota: false,
      };
    }

    if (subscription.empruntsRestants <= 0) {
      return {
        allowed: false,
        reason: "Quota mensuel free epuise",
        plan: SubscriptionPlan.FREE,
        decrementFreeQuota: true,
      };
    }

    return {
      allowed: true,
      plan: SubscriptionPlan.FREE,
      decrementFreeQuota: true,
    };
  }

  async decrementQuota(userId: string) {
    const subscription =
      await this.borrowsRepository.getActiveSubscription(userId);

    return Boolean(
      subscription &&
        subscription.plan === SubscriptionPlan.FREE &&
        subscription.empruntsRestants > 0
    );
  }

  async resetMonthlyQuotas() {
    return this.borrowsRepository.resetFreeQuotas();
  }
}
