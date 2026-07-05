import { ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole, UserStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export enum RevenuePeriod {
  DAY = "day",
  WEEK = "week",
  MONTH = "month",
  YEAR = "year",
}

export class RevenueStatsQueryDto {
  @ApiPropertyOptional({ enum: RevenuePeriod, default: RevenuePeriod.MONTH })
  @IsOptional()
  @IsEnum(RevenuePeriod)
  period: RevenuePeriod = RevenuePeriod.MONTH;
}

export class AdminUsersQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ description: "Recherche par email, nom ou prenom." })
  @IsOptional()
  @IsString()
  search?: string;
}
