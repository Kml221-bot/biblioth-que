import { CACHE_MANAGER, Cache } from "@nestjs/cache-manager";
import { Inject, Injectable } from "@nestjs/common";
import {
  BookStatus,
  NotificationChannel,
  Prisma,
  UserStatus,
} from "@prisma/client";
import { PaginationMetaDto } from "../../common/dto/response.dto";
import {
  calculerAmende,
  calculateDaysLate,
} from "../borrows/utils/penalty.util";
import { AdminRepository } from "./admin.repository";
import {
  AdminUsersQueryDto,
  BroadcastNotificationDto,
  RevenuePeriod,
} from "./dto";

const OVERVIEW_CACHE_KEY = "admin:stats:overview";
const FIVE_MINUTES = 300_000;

@Injectable()
export class AdminService {
  constructor(
    @Inject(AdminRepository) private readonly repository: AdminRepository,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {}

  async getOverviewStats() {
    const cached = await this.cacheManager.get(OVERVIEW_CACHE_KEY);

    if (cached) {
      return cached;
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    const [
      activeUsersThisMonth,
      newUsersThisWeek,
      activeBorrows,
      revenueToday,
      revenueThisWeek,
      revenueThisMonth,
      pendingPenaltiesTotal,
      subscriptions,
    ] = await Promise.all([
      this.repository.countActiveUsersSince(monthStart),
      this.repository.countNewUsersSince(weekStart),
      this.repository.countActiveBorrows(),
      this.repository.sumCompletedTransactionsBetween(todayStart, now),
      this.repository.sumCompletedTransactionsBetween(weekStart, now),
      this.repository.sumCompletedTransactionsBetween(monthStart, now),
      this.repository.sumPendingPenalties(),
      this.repository.groupActiveSubscriptionsByPlan(),
    ]);

    const overview = {
      activeUsersThisMonth,
      newUsersThisWeek,
      activeBorrows,
      revenueToday,
      revenueThisWeek,
      revenueThisMonth,
      pendingPenaltiesTotal,
      activeSubscriptionsByPlan: subscriptions.map((item) => ({
        plan: item.plan,
        count: item._count.plan,
      })),
    };

    await this.cacheManager.set(OVERVIEW_CACHE_KEY, overview, FIVE_MINUTES);

    return overview;
  }

  async getRevenueStats(period: RevenuePeriod) {
    const transactions = await this.repository.findCompletedTransactionsSince(
      startForPeriod(period)
    );
    const groups = new Map<string, { date: string; montant: number; source: string }>();

    for (const transaction of transactions) {
      const date = transaction.createdAt.toISOString().slice(0, 10);
      const source = transaction.type.toLowerCase();
      const key = `${date}:${source}`;
      const current = groups.get(key) ?? { date, montant: 0, source };

      current.montant += transaction.montantTotal;
      groups.set(key, current);
    }

    return Array.from(groups.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }

  async getOverdueBorrows() {
    const now = new Date();
    const borrows = await this.repository.findOverdueBorrows(now);

    return borrows.map((borrow) => {
      const joursRetard = calculateDaysLate(borrow.finPrevue, now);

      return {
        id: borrow.id,
        statut: borrow.statut,
        joursRetard,
        montantAmendeFcfa: calculerAmende(joursRetard),
        finPrevue: borrow.finPrevue.toISOString(),
        user: borrow.user,
        book: borrow.book,
      };
    });
  }

  async approveBook(id: string) {
    const book = await this.repository.updateBookStatus(id, BookStatus.PUBLISHED);
    await this.invalidateAdminCache();

    return {
      ...book,
      publishedAt: book.publishedAt?.toISOString() ?? null,
    };
  }

  async suspendBook(id: string) {
    const book = await this.repository.updateBookStatus(id, BookStatus.SUSPENDED);
    await this.invalidateAdminCache();

    return {
      ...book,
      publishedAt: book.publishedAt?.toISOString() ?? null,
    };
  }

  async waivePenalty(id: string) {
    const penalty = await this.repository.waivePenalty(id);
    await this.invalidateAdminCache();

    return penalty;
  }

  async findUsers(query: AdminUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildUsersWhere(query);
    const [total, users] = await Promise.all([
      this.repository.countUsers(where),
      this.repository.findUsers(where, (page - 1) * limit, limit),
    ]);
    const meta: PaginationMetaDto = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };

    return {
      data: users.map((user) => ({
        ...user,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
      })),
      meta,
    };
  }

  async suspendUser(id: string) {
    const user = await this.repository.suspendUser(id);
    await this.invalidateAdminCache();

    return {
      ...user,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async approveAuthor(id: string) {
    const author = await this.repository.approveAuthor(id);
    await this.invalidateAdminCache();

    return {
      ...author,
      approvedAt: author.approvedAt?.toISOString() ?? null,
    };
  }

  async broadcastNotification(dto: BroadcastNotificationDto) {
    const users = await this.repository.findActiveUserIds();

    if (users.length === 0) {
      return {
        totalRecipients: 0,
        channel: dto.channel ?? NotificationChannel.IN_APP,
        title: dto.title,
      };
    }

    await this.repository.createNotifications(
      users.map((user) => ({
        userId: user.id,
        channel: dto.channel ?? NotificationChannel.IN_APP,
        title: dto.title,
        message: dto.message,
        template: "admin_broadcast",
        payload: (dto.payload ?? {}) as Prisma.InputJsonObject,
      }))
    );

    return {
      totalRecipients: users.length,
      channel: dto.channel ?? NotificationChannel.IN_APP,
      title: dto.title,
    };
  }

  private buildUsersWhere(query: AdminUsersQueryDto): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    if (query.role) {
      where.role = query.role;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: "insensitive" } },
        { nom: { contains: query.search, mode: "insensitive" } },
        { prenom: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (!query.status) {
      where.status = { not: UserStatus.DELETED };
    }

    return where;
  }

  private async invalidateAdminCache() {
    await this.cacheManager.del(OVERVIEW_CACHE_KEY);
  }
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date) {
  const start = startOfDay(date);
  const day = start.getDay() || 7;

  start.setDate(start.getDate() - day + 1);

  return start;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startForPeriod(period: RevenuePeriod) {
  const now = new Date();

  if (period === RevenuePeriod.DAY) {
    return startOfDay(now);
  }

  if (period === RevenuePeriod.WEEK) {
    return startOfWeek(now);
  }

  if (period === RevenuePeriod.YEAR) {
    return new Date(now.getFullYear(), 0, 1);
  }

  return startOfMonth(now);
}
