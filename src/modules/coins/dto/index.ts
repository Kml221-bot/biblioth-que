import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from "class-validator";
import { CoinTransactionType } from "@prisma/client";

// ── DTOs entrants ──────────────────────────────────────────────

export class PurchaseCoinsDto {
  @ApiProperty({ type: Number, example: 100, description: "Nombre de BiblioCoins à acheter" })
  @IsInt()
  @Min(10)
  amount!: number;
}

export class CreditCoinsDto {
  @ApiProperty({ type: String, description: "ID de l'utilisateur à créditer" })
  @IsString()
  userId!: string;

  @ApiProperty({ type: Number, example: 50 })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({ type: String, example: "Bonus de bienvenue" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}

// ── DTOs sortants ──────────────────────────────────────────────

export class CoinBalanceResponseDto {
  @ApiProperty({ type: Number, example: 150, description: "Solde actuel en BiblioCoins" })
  balance!: number;
}

export class CoinTransactionResponseDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ enum: CoinTransactionType }) type!: CoinTransactionType;
  @ApiProperty({ type: Number }) amount!: number;
  @ApiProperty({ type: Number }) balanceAfter!: number;
  @ApiPropertyOptional({ type: String, nullable: true }) description?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) chapterId?: string | null;
  @ApiProperty({ type: String }) createdAt!: Date;
}

export class CoinPackDto {
  @ApiProperty({ type: String, example: "pack_50" })
  id!: string;

  @ApiProperty({ type: String, example: "Pack Starter" })
  label!: string;

  @ApiProperty({ type: Number, example: 50 })
  coins!: number;

  @ApiProperty({ type: Number, example: 500, description: "Prix en FCFA" })
  prixFcfa!: number;

  @ApiProperty({ type: Boolean, example: false })
  isPopular!: boolean;
}
