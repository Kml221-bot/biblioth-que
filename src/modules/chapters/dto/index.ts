import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from "class-validator";

// ── DTOs entrants ──────────────────────────────────────────────

export class CreateChapterDto {
  @ApiProperty({ type: String, example: "Chapitre 1 — L'Arrivée" })
  @IsString()
  @MaxLength(255)
  titre!: string;

  @ApiProperty({ type: Number, example: 1, description: "Position dans le livre (1-based)" })
  @IsInt()
  @Min(1)
  ordre!: number;

  @ApiProperty({ type: Boolean, example: true, description: "Gratuit sans pièces" })
  @IsBoolean()
  isFree!: boolean;

  @ApiProperty({ type: Number, example: 5, description: "Prix en BiblioCoins si non gratuit" })
  @IsInt()
  @Min(0)
  prixPieces!: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUrl()
  contentUrl?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateChapterDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  titre?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsInt()
  @Min(1)
  ordre?: number;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  @IsInt()
  @Min(0)
  prixPieces?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsUrl()
  contentUrl?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

// ── DTOs sortants ──────────────────────────────────────────────

export class ChapterResponseDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) bookId!: string;
  @ApiProperty({ type: String }) titre!: string;
  @ApiProperty({ type: Number }) ordre!: number;
  @ApiProperty({ type: Boolean }) isFree!: boolean;
  @ApiProperty({ type: Number }) prixPieces!: number;
  @ApiPropertyOptional({ type: String, nullable: true }) contentUrl?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) description?: string | null;
  @ApiProperty({ type: String }) createdAt!: Date;

  // Champs calculés selon l'utilisateur connecté
  @ApiProperty({ type: Boolean, description: "L'utilisateur peut-il lire ce chapitre ?" })
  isAccessible!: boolean;

  @ApiProperty({ type: Boolean, description: "Déjà débloqué par l'utilisateur" })
  isUnlocked!: boolean;
}
