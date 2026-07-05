import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole, UserStatus } from "@prisma/client";

export class UserListItemDto {
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
  whatsappNumber?: string | null;

  @ApiProperty({ type: Date })
  createdAt!: Date;

  @ApiPropertyOptional({ type: Date })
  lastLoginAt?: Date | null;
}

export class UserSubscriptionDto {
  @ApiProperty({ type: String })
  plan!: string;

  @ApiProperty({ type: String })
  status!: string;

  @ApiProperty({ type: Number })
  empruntsRestants!: number;

  @ApiPropertyOptional({ type: Date, nullable: true })
  endsAt!: Date | null;
}

export class UserStatsDto {
  @ApiProperty({ type: Number })
  livresLus!: number;

  @ApiProperty({ type: Number })
  pagesLues!: number;

  @ApiProperty({ type: Number })
  minutesLecture!: number;

  @ApiProperty({ type: Number })
  streakJours!: number;
}

export class UserDetailDto extends UserListItemDto {
  @ApiPropertyOptional({ type: String })
  avatarUrl?: string | null;

  @ApiPropertyOptional({ type: String })
  referralCode?: string | null;

  @ApiPropertyOptional({ type: () => UserSubscriptionDto, nullable: true })
  subscription?: UserSubscriptionDto | null;

  @ApiPropertyOptional({ type: () => UserStatsDto, nullable: true })
  stats?: UserStatsDto | null;

  @ApiProperty({ type: Number })
  activeBorrowsCount!: number;

  @ApiProperty({ type: Number })
  pendingPenaltiesCount!: number;
}
