import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  SubscriptionPlan,
  SubscriptionStatus,
  UserRole,
  UserStatus,
} from "@prisma/client";

export class AuthSubscriptionSummaryDto {
  @ApiProperty({ enum: SubscriptionPlan })
  plan!: SubscriptionPlan;

  @ApiProperty({ enum: SubscriptionStatus })
  status!: SubscriptionStatus;

  @ApiProperty({ type: Number })
  empruntsRestants!: number;

  @ApiPropertyOptional({ type: Date, nullable: true })
  endsAt?: Date | null;
}

export class UserStatsResponseDto {
  @ApiProperty({ type: Number })
  livresLus!: number;

  @ApiProperty({ type: Number })
  pagesLues!: number;

  @ApiProperty({ type: Number })
  minutesLecture!: number;

  @ApiProperty({ type: Number })
  streakJours!: number;

  @ApiProperty({ type: [String] })
  categoriesFavorites!: string[];
}

export class UserProfileResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  email!: string;

  @ApiProperty({ type: String })
  nom!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  prenom?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  whatsappNumber?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  avatarUrl?: string | null;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiPropertyOptional({ type: AuthSubscriptionSummaryDto })
  subscription?: AuthSubscriptionSummaryDto | null;

  @ApiPropertyOptional({ type: UserStatsResponseDto })
  stats?: UserStatsResponseDto | null;
}

export class AuthTokensResponseDto {
  @ApiProperty({ type: String })
  accessToken!: string;

  @ApiProperty({ type: String })
  refreshToken!: string;

  @ApiPropertyOptional({ type: Number })
  expiresIn?: number;

  @ApiProperty({ type: UserProfileResponseDto })
  user!: UserProfileResponseDto;
}

export class MfaEnrollmentResponseDto {
  @ApiProperty({ type: String })
  factorId!: string;

  @ApiProperty({ type: String })
  qrCode!: string;
}
