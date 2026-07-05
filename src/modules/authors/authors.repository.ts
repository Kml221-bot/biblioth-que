import { Inject, Injectable } from "@nestjs/common";
import { AuthorStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

const authorSelect = {
  id: true,
  userId: true,
  bio: true,
  status: true,
  waveAccount: true,
  soldeDisponible: true,
  commissionPct: true,
  approvedAt: true,
  createdAt: true,
  user: {
    select: { nom: true, prenom: true, email: true },
  },
  _count: {
    select: { books: true },
  },
} satisfies Prisma.AuthorProfileSelect;

@Injectable()
export class AuthorsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Trouver le profil auteur par userId */
  async findByUserId(userId: string) {
    return this.prisma.authorProfile.findUnique({
      where: { userId },
      select: authorSelect,
    });
  }

  /** Trouver un profil auteur par son ID */
  async findById(id: string) {
    return this.prisma.authorProfile.findUnique({
      where: { id },
      select: authorSelect,
    });
  }

  /** Lister tous les auteurs (avec filtres optionnels) */
  async findMany(skip: number, take: number, status?: AuthorStatus) {
    return this.prisma.authorProfile.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: authorSelect,
    });
  }

  /** Compter les auteurs */
  async count(status?: AuthorStatus) {
    return this.prisma.authorProfile.count({
      where: status ? { status } : undefined,
    });
  }

  /** Creer un profil auteur */
  async create(data: Prisma.AuthorProfileUncheckedCreateInput) {
    return this.prisma.authorProfile.create({
      data,
      select: authorSelect,
    });
  }

  /** Mettre a jour un profil auteur */
  async update(id: string, data: Prisma.AuthorProfileUpdateInput) {
    return this.prisma.authorProfile.update({
      where: { id },
      data,
      select: authorSelect,
    });
  }

  /** Approuver un auteur */
  async approve(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.authorProfile.update({
        where: { id },
        data: {
          status: AuthorStatus.APPROVED,
          approvedAt: new Date(),
        },
        select: { ...authorSelect, userId: true },
      });

      // Mettre a jour le role utilisateur vers AUTHOR
      await tx.user.update({
        where: { id: profile.userId },
        data: { role: "AUTHOR" },
      });

      return profile;
    });
  }

  /** Rejeter un auteur */
  async reject(id: string) {
    return this.prisma.authorProfile.update({
      where: { id },
      data: { status: AuthorStatus.REJECTED },
      select: authorSelect,
    });
  }
}
