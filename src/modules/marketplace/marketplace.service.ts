import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MarketplaceStatus } from "@prisma/client";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PaginationMetaDto } from "../../common/dto/response.dto";
import {
  CreateListingDto,
  ListingResponseDto,
  MarketplaceMessageResponseDto,
  SendMessageDto,
  UpdateListingDto,
} from "./dto";
import { MarketplaceRepository } from "./marketplace.repository";

type ListingRecord = NonNullable<
  Awaited<ReturnType<MarketplaceRepository["findById"]>>
>;
type MessageRecord = Awaited<
  ReturnType<MarketplaceRepository["findMessages"]>
>[number];

@Injectable()
export class MarketplaceService {
  constructor(
    @Inject(MarketplaceRepository)
    private readonly marketplaceRepository: MarketplaceRepository,
  ) {}

  /** Lister les annonces actives du marketplace */
  async findAll(pagination: PaginationDto, search?: string) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      this.marketplaceRepository.findActiveListings(skip, limit, search),
      this.marketplaceRepository.countActiveListings(search),
    ]);

    return {
      data: listings.map((l) => this.toListingResponse(l)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      } satisfies PaginationMetaDto,
    };
  }

  /** Mes annonces */
  async findMine(userId: string) {
    const listings = await this.marketplaceRepository.findByUser(userId);
    return listings.map((l) => this.toListingResponse(l));
  }

  /** Detail d'une annonce */
  async findOne(id: string): Promise<ListingResponseDto> {
    const listing = await this.marketplaceRepository.findById(id);
    if (!listing) {
      throw new NotFoundException("Annonce introuvable");
    }
    return this.toListingResponse(listing);
  }

  /** Creer une annonce */
  async create(
    userId: string,
    dto: CreateListingDto,
  ): Promise<ListingResponseDto> {
    const listing = await this.marketplaceRepository.create({
      sellerId: userId,
      bookId: dto.bookId,
      titre: dto.titre,
      description: dto.description,
      prixAffiche: dto.prixAffiche,
      status: MarketplaceStatus.ACTIVE,
    });

    return this.toListingResponse(listing);
  }

  /** Modifier une annonce (proprietaire seulement) */
  async update(
    id: string,
    userId: string,
    dto: UpdateListingDto,
  ): Promise<ListingResponseDto> {
    const listing = await this.findOwnedListing(id, userId);

    if (listing.status !== MarketplaceStatus.ACTIVE) {
      throw new ConflictException(
        "Seules les annonces actives peuvent etre modifiees",
      );
    }

    const updated = await this.marketplaceRepository.update(id, {
      titre: dto.titre,
      description: dto.description,
      prixAffiche: dto.prixAffiche,
    });

    return this.toListingResponse(updated);
  }

  /** Archiver une annonce (proprietaire seulement) */
  async archive(id: string, userId: string): Promise<ListingResponseDto> {
    await this.findOwnedListing(id, userId);
    const archived = await this.marketplaceRepository.archive(id);
    return this.toListingResponse(archived);
  }

  /** Envoyer un message sur une annonce */
  async sendMessage(
    listingId: string,
    senderId: string,
    dto: SendMessageDto,
  ): Promise<MarketplaceMessageResponseDto> {
    const listing = await this.marketplaceRepository.findById(listingId);

    if (!listing) {
      throw new NotFoundException("Annonce introuvable");
    }

    if (listing.status !== MarketplaceStatus.ACTIVE) {
      throw new ConflictException("Cette annonce n'est plus active");
    }

    // Le destinataire est le vendeur si l'envoyeur n'est pas le vendeur, et vice-versa
    const receiverId =
      senderId === listing.sellerId ? listing.sellerId : listing.sellerId;

    const message = await this.marketplaceRepository.createMessage({
      listingId,
      senderId,
      receiverId:
        senderId === listing.sellerId ? listing.sellerId : listing.sellerId,
      message: dto.message,
    });

    return this.toMessageResponse(message);
  }

  /** Recuperer les messages d'une annonce */
  async getMessages(
    listingId: string,
    userId: string,
    pagination: PaginationDto,
  ) {
    const listing = await this.marketplaceRepository.findById(listingId);

    if (!listing) {
      throw new NotFoundException("Annonce introuvable");
    }

    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 50;
    const skip = (page - 1) * limit;

    // Marquer les messages recus comme lus
    await this.marketplaceRepository.markMessagesAsRead(listingId, userId);

    const messages = await this.marketplaceRepository.findMessages(
      listingId,
      skip,
      limit,
    );

    return messages.map((m) => this.toMessageResponse(m));
  }

  /** Verifier que l'utilisateur est proprietaire de l'annonce */
  private async findOwnedListing(id: string, userId: string) {
    const listing = await this.marketplaceRepository.findById(id);

    if (!listing) {
      throw new NotFoundException("Annonce introuvable");
    }

    if (listing.sellerId !== userId) {
      throw new ForbiddenException(
        "Vous ne pouvez modifier que vos propres annonces",
      );
    }

    return listing;
  }

  private toListingResponse(record: ListingRecord): ListingResponseDto {
    return {
      id: record.id,
      titre: record.titre,
      description: record.description,
      prixAffiche: record.prixAffiche,
      commissionPct: Number(record.commissionPct),
      status: record.status,
      soldAt: record.soldAt,
      createdAt: record.createdAt,
      seller: record.seller,
      book: record.book,
    };
  }

  private toMessageResponse(
    record: MessageRecord,
  ): MarketplaceMessageResponseDto {
    return {
      id: record.id,
      message: record.message,
      senderId: record.senderId,
      senderNom: record.sender.nom,
      readAt: record.readAt,
      createdAt: record.createdAt,
    };
  }
}
