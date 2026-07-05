import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  AuthorStatus,
  BookStatus,
  BorrowStatus,
  NotificationChannel,
  PenaltyStatus,
  SubscriptionPlan,
  UserRole,
  UserStatus,
} from "@prisma/client";

export class SubscriptionPlanCountDto {
  @ApiProperty({ enum: SubscriptionPlan })
  plan!: SubscriptionPlan;

  @ApiProperty({ type: Number })
  count!: number;
}

export class OverviewStatsResponseDto {
  @ApiProperty({ type: Number })
  activeUsersThisMonth!: number;

  @ApiProperty({ type: Number })
  newUsersThisWeek!: number;

  @ApiProperty({ type: Number })
  activeBorrows!: number;

  @ApiProperty({ type: Number })
  revenueToday!: number;

  @ApiProperty({ type: Number })
  revenueThisWeek!: number;

  @ApiProperty({ type: Number })
  revenueThisMonth!: number;

  @ApiProperty({ type: Number })
  pendingPenaltiesTotal!: number;

  @ApiProperty({ type: SubscriptionPlanCountDto, isArray: true })
  activeSubscriptionsByPlan!: SubscriptionPlanCountDto[];
}

export class RevenuePointResponseDto {
  @ApiProperty({ type: String, example: "2026-05-27" })
  date!: string;

  @ApiProperty({ type: Number })
  montant!: number;

  @ApiProperty({ type: String, example: "borrow" })
  source!: string;
}

export class OverdueBorrowResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ enum: BorrowStatus })
  statut!: BorrowStatus;

  @ApiProperty({ type: Number })
  joursRetard!: number;

  @ApiProperty({ type: Number })
  montantAmendeFcfa!: number;

  @ApiProperty({ type: String })
  finPrevue!: string;

  @ApiProperty({ type: Object })
  user!: {
    id: string;
    email: string;
    nom: string;
    prenom?: string | null;
    whatsappNumber?: string | null;
  };

  @ApiProperty({ type: Object })
  book!: {
    id: string;
    titre: string;
    auteur: string;
  };
}

export class AdminUserResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  email!: string;

  @ApiProperty({ type: String })
  nom!: string;

  @ApiPropertyOptional({ type: String })
  prenom?: string | null;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiPropertyOptional({ type: String })
  lastLoginAt?: string | null;

  @ApiProperty({ type: String })
  createdAt!: string;
}

export class AdminBookActionResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  titre!: string;

  @ApiProperty({ enum: BookStatus })
  status!: BookStatus;

  @ApiPropertyOptional({ type: String })
  publishedAt?: string | null;
}

export class AdminPenaltyActionResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ enum: PenaltyStatus })
  status!: PenaltyStatus;

  @ApiProperty({ type: Number })
  montantFcfa!: number;
}

export class AdminAuthorActionResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  userId!: string;

  @ApiProperty({ enum: AuthorStatus })
  status!: AuthorStatus;

  @ApiPropertyOptional({ type: String })
  approvedAt?: string | null;
}

export class BroadcastNotificationResponseDto {
  @ApiProperty({ type: Number })
  totalRecipients!: number;

  @ApiProperty({ enum: NotificationChannel })
  channel!: NotificationChannel;

  @ApiProperty({ type: String })
  title!: string;
}
