import { Inject, Injectable } from "@nestjs/common";
import { BorrowStatus, PenaltyStatus, Prisma, UserStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

/** Champs selectionnes pour les listes d'utilisateurs */
const userListSelect = {
  id: true,
  email: true,
  nom: true,
  prenom: true,
  role: true,
  status: true,
  whatsappNumber: true,
  createdAt: true,
  lastLoginAt: true,
} satisfies Prisma.UserSelect;

/** Champs selectionnes pour le detail utilisateur */
const userDetailSelect = {
  ...userListSelect,
  avatarUrl: true,
  referralCode: true,
  subscriptions: {
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: {
      plan: true,
      status: true,
      empruntsRestants: true,
      endsAt: true,
    },
  },
  stats: {
    select: {
      livresLus: true,
      pagesLues: true,
      minutesLecture: true,
      streakJours: true,
    },
  },
  _count: {
    select: {
      borrows: { where: { statut: BorrowStatus.ACTIVE } },
      penalties: { where: { status: PenaltyStatus.PENDING } },
    },
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Liste paginee des utilisateurs avec filtres optionnels */
  async findMany(
    skip: number,
    take: number,
    where?: Prisma.UserWhereInput,
    cursor?: string,
  ) {
    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: cursor ? 1 : skip,
      take,
      cursor: cursor ? { id: cursor } : undefined,
      select: userListSelect,
    });
  }

  /** Compter le nombre total d'utilisateurs selon les filtres */
  async count(where?: Prisma.UserWhereInput) {
    return this.prisma.user.count({ where });
  }

  /** Detail complet d'un utilisateur avec subscription et stats */
  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: userDetailSelect,
    });
  }

  /** Mettre a jour un utilisateur */
  async update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: userDetailSelect,
    });
  }

  /** Suspendre un utilisateur */
  async suspend(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.SUSPENDED },
      select: userDetailSelect,
    });
  }

  /** Reactiver un utilisateur */
  async reactivate(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE },
      select: userDetailSelect,
    });
  }
}
