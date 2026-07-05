import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuthorStatus } from "@prisma/client";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PaginationMetaDto } from "../../common/dto/response.dto";
import {
  AuthorProfileResponseDto,
  CreateAuthorProfileDto,
  UpdateAuthorProfileDto,
} from "./dto";
import { AuthorsRepository } from "./authors.repository";

type AuthorRecord = NonNullable<
  Awaited<ReturnType<AuthorsRepository["findById"]>>
>;

@Injectable()
export class AuthorsService {
  constructor(
    @Inject(AuthorsRepository)
    private readonly authorsRepository: AuthorsRepository,
  ) {}

  /** Recuperer mon profil auteur */
  async getMyProfile(userId: string): Promise<AuthorProfileResponseDto | null> {
    const profile = await this.authorsRepository.findByUserId(userId);
    return profile ? this.toResponse(profile) : null;
  }

  /** Creer une demande de profil auteur */
  async createProfile(
    userId: string,
    dto: CreateAuthorProfileDto,
  ): Promise<AuthorProfileResponseDto> {
    const existing = await this.authorsRepository.findByUserId(userId);

    if (existing) {
      throw new ConflictException("Vous avez deja un profil auteur");
    }

    const profile = await this.authorsRepository.create({
      userId,
      bio: dto.bio,
      waveAccount: dto.waveAccount,
      status: AuthorStatus.PENDING,
    });

    return this.toResponse(profile);
  }

  /** Mettre a jour mon profil auteur */
  async updateProfile(
    userId: string,
    dto: UpdateAuthorProfileDto,
  ): Promise<AuthorProfileResponseDto> {
    const existing = await this.authorsRepository.findByUserId(userId);

    if (!existing) {
      throw new NotFoundException("Profil auteur introuvable");
    }

    const updated = await this.authorsRepository.update(existing.id, {
      bio: dto.bio,
      waveAccount: dto.waveAccount,
    });

    return this.toResponse(updated);
  }

  /** Lister tous les auteurs (admin) */
  async findAll(pagination: PaginationDto, status?: AuthorStatus) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;

    const [authors, total] = await Promise.all([
      this.authorsRepository.findMany(skip, limit, status),
      this.authorsRepository.count(status),
    ]);

    return {
      data: authors.map((a) => this.toResponse(a)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      } satisfies PaginationMetaDto,
    };
  }

  /** Approuver un auteur (admin) */
  async approve(id: string): Promise<AuthorProfileResponseDto> {
    const author = await this.findOrFail(id);

    if (author.status === AuthorStatus.APPROVED) {
      throw new ConflictException("Cet auteur est deja approuve");
    }

    const approved = await this.authorsRepository.approve(id);
    return this.toResponse(approved);
  }

  /** Rejeter un auteur (admin) */
  async reject(id: string): Promise<AuthorProfileResponseDto> {
    const author = await this.findOrFail(id);

    if (author.status === AuthorStatus.REJECTED) {
      throw new ConflictException("Cet auteur est deja rejete");
    }

    const rejected = await this.authorsRepository.reject(id);
    return this.toResponse(rejected);
  }

  private async findOrFail(id: string) {
    const author = await this.authorsRepository.findById(id);
    if (!author) {
      throw new NotFoundException("Profil auteur introuvable");
    }
    return author;
  }

  private toResponse(record: AuthorRecord): AuthorProfileResponseDto {
    return {
      id: record.id,
      userId: record.userId,
      bio: record.bio,
      status: record.status,
      waveAccount: record.waveAccount,
      soldeDisponible: record.soldeDisponible,
      commissionPct: Number(record.commissionPct),
      approvedAt: record.approvedAt,
      createdAt: record.createdAt,
      user: record.user,
      booksCount: record._count.books,
    };
  }
}
