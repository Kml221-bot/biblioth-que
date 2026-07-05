import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { UserRole, UserStatus } from "@prisma/client";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { PaginationMetaDto } from "../../common/dto/response.dto";
import { UpdateUserDto, UserDetailDto, UserListItemDto } from "./dto";
import { UsersRepository } from "./users.repository";

type UserDetailRecord = NonNullable<
  Awaited<ReturnType<UsersRepository["findById"]>>
>;

@Injectable()
export class UsersService {
  constructor(
    @Inject(UsersRepository)
    private readonly usersRepository: UsersRepository,
  ) {}

  /** Liste paginee des utilisateurs (admin) */
  async findAll(
    pagination: PaginationDto,
    role?: UserRole,
    status?: UserStatus,
    search?: string,
  ) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 20;
    const skip = (page - 1) * limit;

    // Construire les filtres Prisma dynamiquement
    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: "insensitive" } },
        { prenom: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      this.usersRepository.findMany(skip, limit, where, pagination.cursor),
      this.usersRepository.count(where),
    ]);

    return {
      data: users.map((user) => this.toListItem(user)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        nextCursor:
          users.length === limit ? users[users.length - 1].id : undefined,
      } satisfies PaginationMetaDto,
    };
  }

  /** Detail complet d'un utilisateur */
  async findOne(id: string): Promise<UserDetailDto> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException("Utilisateur introuvable");
    }

    return this.toDetail(user);
  }

  /** Mise a jour d'un utilisateur par un admin */
  async update(id: string, dto: UpdateUserDto): Promise<UserDetailDto> {
    const existing = await this.usersRepository.findById(id);

    if (!existing) {
      throw new NotFoundException("Utilisateur introuvable");
    }

    // Empecher de modifier un super_admin
    if (existing.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        "Impossible de modifier un compte super admin",
      );
    }

    const updated = await this.usersRepository.update(id, {
      nom: dto.nom,
      prenom: dto.prenom,
      whatsappNumber: dto.whatsappNumber,
      role: dto.role,
      status: dto.status,
    });

    return this.toDetail(updated);
  }

  /** Suspendre un utilisateur */
  async suspend(id: string): Promise<UserDetailDto> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException("Utilisateur introuvable");
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException("Impossible de suspendre un super admin");
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException("Cet utilisateur est deja suspendu");
    }

    const suspended = await this.usersRepository.suspend(id);
    return this.toDetail(suspended);
  }

  /** Reactiver un utilisateur suspendu */
  async reactivate(id: string): Promise<UserDetailDto> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException("Utilisateur introuvable");
    }

    if (user.status !== UserStatus.SUSPENDED) {
      throw new ForbiddenException("Cet utilisateur n'est pas suspendu");
    }

    const reactivated = await this.usersRepository.reactivate(id);
    return this.toDetail(reactivated);
  }

  private toListItem(user: {
    id: string;
    email: string;
    nom: string;
    prenom: string | null;
    role: UserRole;
    status: UserStatus;
    whatsappNumber: string | null;
    createdAt: Date;
    lastLoginAt: Date | null;
  }): UserListItemDto {
    return {
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
      status: user.status,
      whatsappNumber: user.whatsappNumber,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  private toDetail(user: UserDetailRecord): UserDetailDto {
    const subscription = user.subscriptions[0] ?? null;

    return {
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
      status: user.status,
      whatsappNumber: user.whatsappNumber,
      avatarUrl: user.avatarUrl,
      referralCode: user.referralCode,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            empruntsRestants: subscription.empruntsRestants,
            endsAt: subscription.endsAt,
          }
        : null,
      stats: user.stats
        ? {
            livresLus: user.stats.livresLus,
            pagesLues: user.stats.pagesLues,
            minutesLecture: user.stats.minutesLecture,
            streakJours: user.stats.streakJours,
          }
        : null,
      activeBorrowsCount: user._count.borrows,
      pendingPenaltiesCount: user._count.penalties,
    };
  }
}
