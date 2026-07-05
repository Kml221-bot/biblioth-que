import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PaginationMetaDto } from "../../common/dto/response.dto";
import { GamificationService } from "../gamification/gamification.service";
import {
  BookRatingDto,
  CreateReviewDto,
  ReviewResponseDto,
  UpdateReviewDto,
} from "./dto";
import { ReviewsRepository } from "./reviews.repository";

type ReviewRecord = NonNullable<
  Awaited<ReturnType<ReviewsRepository["findByUserAndBook"]>>
>;

@Injectable()
export class ReviewsService {
  constructor(
    @Inject(ReviewsRepository)
    private readonly reviewsRepository: ReviewsRepository,
    @Inject(GamificationService)
    private readonly gamificationService: GamificationService,
  ) {}

  /** Lister les reviews d'un livre */
  async findByBook(bookId: string, pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.reviewsRepository.findByBook(bookId, skip, limit),
      this.reviewsRepository.countByBook(bookId),
    ]);

    return {
      data: reviews.map((r) => this.toResponse(r)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      } satisfies PaginationMetaDto,
    };
  }

  /** Note moyenne + distribution d'un livre */
  async getBookRating(bookId: string): Promise<BookRatingDto> {
    const rating = await this.reviewsRepository.getBookRating(bookId);

    return { bookId, ...rating };
  }

  /** Ma review sur un livre (ou null) */
  async getMyReview(
    userId: string,
    bookId: string,
  ): Promise<ReviewResponseDto | null> {
    const review = await this.reviewsRepository.findByUserAndBook(
      userId,
      bookId,
    );

    return review ? this.toResponse(review) : null;
  }

  /** Creer une review (1 seule par utilisateur par livre) */
  async create(
    userId: string,
    bookId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    const existing = await this.reviewsRepository.findByUserAndBook(
      userId,
      bookId,
    );

    if (existing) {
      throw new ConflictException(
        "Vous avez deja laisse un avis pour ce livre. Modifiez-le plutot.",
      );
    }

    const review = await this.reviewsRepository.create({
      userId,
      bookId,
      note: dto.note,
      commentaire: dto.commentaire,
    });

    // Recalculer la note moyenne du livre
    await this.recalculateBookAverage(bookId);

    // Badge FIRST_REVIEW — fire-and-forget
    this.gamificationService.checkAfterReview(userId).catch(() => {});

    return this.toResponse(review);
  }

  /** Modifier ma review */
  async update(
    userId: string,
    bookId: string,
    dto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    const existing = await this.reviewsRepository.findByUserAndBook(
      userId,
      bookId,
    );

    if (!existing) {
      throw new NotFoundException("Vous n'avez pas encore laisse d'avis");
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException(
        "Vous ne pouvez modifier que votre propre avis",
      );
    }

    const updated = await this.reviewsRepository.update(existing.id, {
      note: dto.note,
      commentaire: dto.commentaire,
    });

    // Recalculer la note moyenne
    await this.recalculateBookAverage(bookId);

    return this.toResponse(updated);
  }

  /** Supprimer ma review */
  async delete(userId: string, bookId: string) {
    const existing = await this.reviewsRepository.findByUserAndBook(
      userId,
      bookId,
    );

    if (!existing) {
      throw new NotFoundException("Avis introuvable");
    }

    if (existing.userId !== userId) {
      throw new ForbiddenException(
        "Vous ne pouvez supprimer que votre propre avis",
      );
    }

    await this.reviewsRepository.delete(existing.id);
    await this.recalculateBookAverage(bookId);

    return { deleted: true };
  }

  /** Recalculer et persister la note moyenne d'un livre */
  private async recalculateBookAverage(bookId: string) {
    const rating = await this.reviewsRepository.getBookRating(bookId);
    await this.reviewsRepository.updateBookAverage(bookId, rating.noteMoyenne);
  }

  private toResponse(record: ReviewRecord): ReviewResponseDto {
    return {
      id: record.id,
      note: record.note,
      commentaire: record.commentaire,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      user: record.user,
    };
  }
}
