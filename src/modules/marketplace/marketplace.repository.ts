import { Inject, Injectable } from "@nestjs/common";
import { MarketplaceStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

const listingSelect = {
  id: true,
  titre: true,
  description: true,
  prixAffiche: true,
  commissionPct: true,
  status: true,
  soldAt: true,
  createdAt: true,
  sellerId: true,
  bookId: true,
  seller: { select: { id: true, nom: true, prenom: true } },
  book: { select: { id: true, titre: true, auteur: true, coverUrl: true } },
} satisfies Prisma.MarketplaceListingSelect;

const messageSelect = {
  id: true,
  message: true,
  senderId: true,
  receiverId: true,
  readAt: true,
  createdAt: true,
  sender: { select: { nom: true } },
} satisfies Prisma.MarketplaceMessageSelect;

@Injectable()
export class MarketplaceRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Lister les annonces actives avec filtres */
  async findActiveListings(skip: number, take: number, search?: string) {
    const where: Prisma.MarketplaceListingWhereInput = {
      status: MarketplaceStatus.ACTIVE,
      ...(search
        ? {
            OR: [
              { titre: { contains: search, mode: "insensitive" } },
              { book: { titre: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    return this.prisma.marketplaceListing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: listingSelect,
    });
  }

  /** Compter les annonces actives */
  async countActiveListings(search?: string) {
    const where: Prisma.MarketplaceListingWhereInput = {
      status: MarketplaceStatus.ACTIVE,
      ...(search
        ? {
            OR: [
              { titre: { contains: search, mode: "insensitive" } },
              { book: { titre: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    return this.prisma.marketplaceListing.count({ where });
  }

  /** Mes annonces (vendeur) */
  async findByUser(userId: string) {
    return this.prisma.marketplaceListing.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: "desc" },
      select: listingSelect,
    });
  }

  /** Detail d'une annonce */
  async findById(id: string) {
    return this.prisma.marketplaceListing.findUnique({
      where: { id },
      select: listingSelect,
    });
  }

  /** Creer une annonce */
  async create(data: Prisma.MarketplaceListingUncheckedCreateInput) {
    return this.prisma.marketplaceListing.create({
      data,
      select: listingSelect,
    });
  }

  /** Mettre a jour une annonce */
  async update(id: string, data: Prisma.MarketplaceListingUpdateInput) {
    return this.prisma.marketplaceListing.update({
      where: { id },
      data,
      select: listingSelect,
    });
  }

  /** Archiver une annonce */
  async archive(id: string) {
    return this.prisma.marketplaceListing.update({
      where: { id },
      data: { status: MarketplaceStatus.ARCHIVED },
      select: listingSelect,
    });
  }

  /** Messages d'une annonce */
  async findMessages(listingId: string, skip: number, take: number) {
    return this.prisma.marketplaceMessage.findMany({
      where: { listingId },
      orderBy: { createdAt: "asc" },
      skip,
      take,
      select: messageSelect,
    });
  }

  /** Envoyer un message */
  async createMessage(data: Prisma.MarketplaceMessageUncheckedCreateInput) {
    return this.prisma.marketplaceMessage.create({
      data,
      select: messageSelect,
    });
  }

  /** Marquer les messages comme lus */
  async markMessagesAsRead(listingId: string, receiverId: string) {
    return this.prisma.marketplaceMessage.updateMany({
      where: { listingId, receiverId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
