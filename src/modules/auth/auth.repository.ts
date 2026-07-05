import { Inject, Injectable } from "@nestjs/common";
import {
  PenaltyStatus,
  Prisma,
  SubscriptionPlan,
  SubscriptionStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

export type UserProfileWithRelations = Prisma.UserGetPayload<{
  include: {
    subscriptions: {
      orderBy: { createdAt: "desc" };
      take: 1;
    };
    stats: true;
  };
}>;

type CreateUserProfileData = {
  id: string;
  email: string;
  nom: string;
  prenom?: string;
  whatsappNumber?: string;
  referralCode?: string;
  referredByCode?: string;
};

@Injectable()
export class AuthRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createUserProfile(data: CreateUserProfileData) {
    return this.prisma.$transaction(async tx => {
      const referrer = data.referredByCode
        ? await tx.user.findUnique({
            where: { referralCode: data.referredByCode },
            select: { id: true },
          })
        : null;

      const user = await tx.user.create({
        data: {
          id: data.id,
          email: data.email,
          nom: data.nom,
          prenom: data.prenom,
          whatsappNumber: data.whatsappNumber,
          referralCode: data.referralCode,
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
          subscriptions: {
            create: {
              plan: SubscriptionPlan.FREE,
              status: SubscriptionStatus.ACTIVE,
              empruntsRestants: 3,
            },
          },
          stats: {
            create: {
              categoriesFavorites: [],
            },
          },
        },
        include: {
          subscriptions: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          stats: true,
        },
      });

      if (referrer) {
        await tx.affiliation.create({
          data: {
            referrerId: referrer.id,
            referredId: user.id,
            code: data.referredByCode as string,
          },
        });
      }

      return user;
    });
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        stats: true,
      },
    });
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        stats: true,
      },
    });
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data,
      include: {
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        stats: true,
      },
    });
  }

  async deleteUser(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        email: `deleted-${id}@anonymized.bibliotech.local`,
        nom: "Utilisateur",
        prenom: "Supprime",
        whatsappNumber: null,
        avatarUrl: null,
        status: UserStatus.DELETED,
        anonymizedAt: new Date(),
      },
    });
  }

  async countPendingPenalties(userId: string) {
    return this.prisma.penalty.count({
      where: {
        userId,
        status: PenaltyStatus.PENDING,
      },
    });
  }
}
