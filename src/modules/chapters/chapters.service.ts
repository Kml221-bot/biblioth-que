import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import { CoinTransactionType, UserRole } from "@prisma/client";
import { Queue } from "bull";
import { PrismaService } from "../../prisma/prisma.service";
import { CoinsRepository } from "../coins/coins.repository";
import { ChaptersRepository } from "./chapters.repository";
import { ChapterResponseDto, CreateChapterDto, UpdateChapterDto } from "./dto";

@Injectable()
export class ChaptersService {
  private readonly logger = new Logger(ChaptersService.name);

  constructor(
    @Inject(ChaptersRepository)
    private readonly repo: ChaptersRepository,
    @Inject(CoinsRepository)
    private readonly coinsRepo: CoinsRepository,
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @InjectQueue("notifications")
    private readonly notificationsQueue: Queue,
  ) {}

  // ── Lister les chapitres d'un livre ────────────────────────
  async findAllByBook(bookId: string, userId?: string, userRole?: UserRole) {
    const chapters = await this.repo.findAllByBook(bookId, userId);

    return chapters.map((ch, idx) => {
      const isUnlocked =
        Array.isArray(ch.accesses) && ch.accesses.length > 0;

      // Admin/auteur voit tout
      const isAdmin =
        userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;

      const isAccessible =
        isAdmin ||
        ch.isFree ||
        isUnlocked;

      return this.toDto({ ...ch, accesses: undefined }, isAccessible, isUnlocked);
    });
  }

  // ── Détail d'un chapitre ────────────────────────────────────
  async findOne(id: string, userId?: string, userRole?: UserRole) {
    const ch = await this.repo.findOne(id);
    if (!ch) throw new NotFoundException("Chapitre introuvable");

    const isAdmin =
      userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;

    let isUnlocked = false;
    if (userId) {
      const access = await this.repo.findAccess(userId, id);
      isUnlocked = !!access;
    }

    const isAccessible = isAdmin || ch.isFree || isUnlocked;
    return this.toDto(ch, isAccessible, isUnlocked);
  }

  // ── Débloquer un chapitre avec des BiblioCoins ─────────────
  async unlock(chapterId: string, userId: string) {
    const ch = await this.repo.findOne(chapterId);
    if (!ch) throw new NotFoundException("Chapitre introuvable");

    if (ch.isFree) {
      throw new ForbiddenException("Ce chapitre est déjà gratuit");
    }

    const existing = await this.repo.findAccess(userId, chapterId);
    if (existing) {
      throw new ForbiddenException("Chapitre déjà débloqué");
    }

    const wallet = await this.coinsRepo.getBalance(userId);
    const balance = wallet?.coinBalance ?? 0;

    if (balance < ch.prixPieces) {
      throw new ForbiddenException(
        `Solde insuffisant — il vous faut ${ch.prixPieces} BiblioCoins (vous en avez ${balance})`
      );
    }

    await Promise.all([
      this.coinsRepo.debit(
        userId,
        ch.prixPieces,
        CoinTransactionType.UNLOCK,
        `Déblocage : ${ch.titre}`,
        chapterId
      ),
      this.repo.createAccess(userId, chapterId, ch.prixPieces),
    ]);

    // Notification WhatsApp après déblocage
    this.prisma.user.findUnique({
      where: { id: userId },
      select: { whatsappNumber: true },
    }).then(user => {
      if (user?.whatsappNumber) {
        this.notificationsQueue.add(
          "whatsapp",
          {
            userId,
            to: user.whatsappNumber,
            template: "CHAPTER_UNLOCKED",
            vars: { titre: ch.titre },
          },
          { attempts: 2, backoff: { type: "fixed", delay: 5_000 } },
        ).catch(e => this.logger.warn(`WhatsApp CHAPTER_UNLOCKED échoué: ${e.message}`));
      }
    }).catch(() => {});

    return this.toDto(ch, true, true);
  }

  // ── CRUD admin ──────────────────────────────────────────────
  async create(bookId: string, dto: CreateChapterDto) {
    const ch = await this.repo.create(bookId, dto);
    return this.toDto(ch, true, false);
  }

  async update(id: string, dto: UpdateChapterDto) {
    const ch = await this.repo.update(id, dto);
    return this.toDto(ch, true, false);
  }

  async delete(id: string) {
    await this.repo.delete(id);
  }

  // ── Mapper ──────────────────────────────────────────────────
  private toDto(ch: any, isAccessible: boolean, isUnlocked: boolean): ChapterResponseDto {
    return {
      id: ch.id,
      bookId: ch.bookId,
      titre: ch.titre,
      ordre: ch.ordre,
      isFree: ch.isFree,
      prixPieces: ch.prixPieces,
      contentUrl: isAccessible ? ch.contentUrl : null,
      description: ch.description,
      createdAt: ch.createdAt,
      isAccessible,
      isUnlocked,
    };
  }
}
