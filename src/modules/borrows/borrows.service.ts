import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BorrowStatus, SubscriptionPlan, TypeAcces } from "@prisma/client";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PaginationMetaDto } from "../../common/dto/response.dto";
import {
  BorrowResponseDto,
  CreateBorrowDto,
  RenewBorrowDto,
  RenewalPaymentResponseDto,
  UpdateProgressDto,
} from "./dto";
import { BorrowsRepository } from "./borrows.repository";
import { QuotaService } from "./quota.service";
import { GamificationService } from "../gamification/gamification.service";
import {
  addDays,
  calculateDaysLate,
  calculerAmende,
} from "./utils/penalty.util";

type BorrowRecord = NonNullable<
  Awaited<ReturnType<BorrowsRepository["findById"]>>
>;

@Injectable()
export class BorrowsService {
  constructor(
    @Inject(BorrowsRepository)
    private readonly borrowsRepository: BorrowsRepository,
    @Inject(QuotaService)
    private readonly quotaService: QuotaService,
    @Inject(GamificationService)
    private readonly gamificationService: GamificationService,
  ) {}

  async findActive(userId: string) {
    const borrows = await this.borrowsRepository.findActiveByUser(userId);

    return borrows.map(borrow => this.toBorrowResponse(borrow));
  }

  async findHistory(userId: string, pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;
    const [borrows, total] = await Promise.all([
      this.borrowsRepository.findHistoryByUser(
        userId,
        skip,
        limit,
        pagination.cursor
      ),
      this.borrowsRepository.countHistoryByUser(userId),
    ]);

    return {
      data: borrows.map(borrow => this.toBorrowResponse(borrow)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        nextCursor:
          borrows.length === limit ? borrows[borrows.length - 1].id : undefined,
      } satisfies PaginationMetaDto,
    };
  }

  async findOne(id: string, userId: string) {
    const borrow = await this.getOwnedBorrow(id, userId);

    return this.toBorrowResponse(borrow);
  }

  async createBorrow(userId: string, dto: CreateBorrowDto) {
    const book = await this.borrowsRepository.findPublishedBook(dto.bookId);

    if (!book) {
      throw new NotFoundException("Livre introuvable");
    }

    if (book.typeAcces === TypeAcces.BUY_ONLY) {
      throw new BadRequestException(
        "Ce livre est disponible uniquement a l’achat"
      );
    }

    const quota = await this.quotaService.canBorrow(userId);

    if (!quota.allowed) {
      throw new ForbiddenException(
        quota.reason ?? "Quota d’emprunt insuffisant"
      );
    }

    if (
      book.typeAcces === TypeAcces.PREMIUM &&
      quota.plan === SubscriptionPlan.FREE
    ) {
      throw new ForbiddenException("Ce livre est reserve aux abonnes premium");
    }

    const existingBorrow =
      await this.borrowsRepository.findActiveBorrowByUserAndBook(
        userId,
        dto.bookId
      );

    if (existingBorrow) {
      throw new ConflictException(
        "Vous avez deja un emprunt actif pour ce livre"
      );
    }

    const now = new Date();

    try {
      const borrow = await this.borrowsRepository.createBorrowWithQuota({
        userId,
        bookId: dto.bookId,
        dureeJours: dto.dureeJours,
        finPrevue: addDays(now, dto.dureeJours),
        decrementFreeQuota: quota.decrementFreeQuota,
      });

      // Attribuer le badge FIRST_BORROW (fire-and-forget)
      this.gamificationService.checkAfterBorrow(userId).catch(() => {});

      return this.toBorrowResponse(borrow);
    } catch (error) {
      if (error instanceof Error && error.message === "QUOTA_EXHAUSTED") {
        throw new ForbiddenException("Quota mensuel free epuise");
      }

      throw error;
    }
  }

  async renewBorrow(
    id: string,
    userId: string,
    dto: RenewBorrowDto
  ): Promise<RenewalPaymentResponseDto> {
    const borrow = await this.getOwnedBorrow(id, userId);

    if (
      borrow.statut !== BorrowStatus.ACTIVE &&
      borrow.statut !== BorrowStatus.OVERDUE
    ) {
      throw new BadRequestException("Cet emprunt ne peut pas etre renouvele");
    }

    if (borrow.nbRenouvellements >= 2) {
      throw new ForbiddenException("Nombre maximum de renouvellements atteint");
    }

    const montantFcfa = dto.dureeJours === 7 ? 200 : 350;
    const transaction = await this.borrowsRepository.createRenewalPayment({
      borrowId: borrow.id,
      userId,
      bookId: borrow.bookId,
      dureeJours: dto.dureeJours,
      montantFcfa,
    });

    return {
      borrowId: borrow.id,
      transactionId: transaction.id,
      montantFcfa: transaction.montantTotal,
      status: transaction.status,
    };
  }

  async returnBorrow(id: string, userId: string) {
    const borrow = await this.getOwnedBorrow(id, userId);

    if (borrow.statut === BorrowStatus.RETURNED) {
      throw new BadRequestException("Cet emprunt est deja retourne");
    }

    const joursRetard = calculateDaysLate(borrow.finPrevue);
    const montantAmende = calculerAmende(joursRetard);
    const returnedBorrow = await this.borrowsRepository.returnBorrow({
      borrowId: borrow.id,
      joursRetard,
      montantAmende,
    });

    // Verifier les badges de lecture (paliers + categorie) — fire-and-forget
    this.gamificationService
      .checkAfterReturn(userId, borrow.book.categorie)
      .catch(() => {});

    return {
      ...this.toBorrowResponse(returnedBorrow),
      joursRetard,
      montantAmende,
    };
  }

  async updateProgress(id: string, userId: string, dto: UpdateProgressDto) {
    const borrow = await this.getOwnedBorrow(id, userId);

    if (
      borrow.statut !== BorrowStatus.ACTIVE &&
      borrow.statut !== BorrowStatus.OVERDUE
    ) {
      throw new BadRequestException(
        "La progression ne peut etre mise a jour que sur un emprunt actif"
      );
    }

    const pourcentageLu = Number(dto.pourcentageLu);

    if (pourcentageLu < 0 || pourcentageLu > 100) {
      throw new BadRequestException(
        "Le pourcentage lu doit etre entre 0 et 100"
      );
    }

    const updatedBorrow = await this.borrowsRepository.updateProgress({
      borrowId: borrow.id,
      userId,
      bookId: borrow.bookId,
      pageActuelle: dto.pageActuelle,
      pourcentageLu,
      dureeMinutes: dto.dureeMinutes,
    });

    return this.toBorrowResponse(updatedBorrow);
  }

  async findOverdue() {
    const borrows = await this.borrowsRepository.findOverdueBorrows();

    return borrows.map(borrow => this.toBorrowResponse(borrow));
  }

  private async getOwnedBorrow(id: string, userId: string) {
    const borrow = await this.borrowsRepository.findById(id);

    if (!borrow) {
      throw new NotFoundException("Emprunt introuvable");
    }

    if (borrow.userId !== userId) {
      throw new ForbiddenException("Vous ne pouvez pas acceder a cet emprunt");
    }

    return borrow;
  }

  private toBorrowResponse(borrow: BorrowRecord): BorrowResponseDto {
    return {
      id: borrow.id,
      statut: borrow.statut,
      debut: borrow.debut,
      finPrevue: borrow.finPrevue,
      finReelle: borrow.finReelle,
      dureeJours: borrow.dureeJours,
      joursRestants: this.calculateDaysRemaining(borrow.finPrevue),
      pageActuelle: borrow.pageActuelle,
      pourcentageLu: Number(borrow.pourcentageLu),
      nbRenouvellements: borrow.nbRenouvellements,
      book: {
        id: borrow.book.id,
        titre: borrow.book.titre,
        auteur: borrow.book.auteur,
        categorie: borrow.book.categorie,
        typeAcces: borrow.book.typeAcces as import("@prisma/client").TypeAcces,
        coverUrl: borrow.book.coverUrl,
      },
      penalties: borrow.penalties,
    };
  }

  private calculateDaysRemaining(finPrevue: Date) {
    const diffMs = finPrevue.getTime() - Date.now();

    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }
}
