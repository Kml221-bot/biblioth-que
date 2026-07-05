import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateListingDto {
  @ApiProperty({ example: "uuid-du-livre" })
  @IsUUID()
  bookId!: string;

  @ApiProperty({ example: "Livre en excellent etat" })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  titre!: string;

  @ApiPropertyOptional({ example: "Achete il y a 2 mois, lu une fois" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: 1500, description: "Prix en FCFA" })
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(50_000)
  prixAffiche!: number;
}

export class UpdateListingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  titre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(50_000)
  prixAffiche?: number;
}

export class SendMessageDto {
  @ApiProperty({ example: "Bonjour, le livre est-il toujours disponible ?" })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message!: string;
}

export class MarketplaceUserSummaryDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  nom!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  prenom!: string | null;
}

export class MarketplaceBookSummaryDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  titre!: string;

  @ApiProperty({ type: String })
  auteur!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  coverUrl!: string | null;
}

export class ListingResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  titre!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description?: string | null;

  @ApiProperty({ type: Number })
  prixAffiche!: number;

  @ApiProperty({ type: Number })
  commissionPct!: number;

  @ApiProperty({ type: String })
  status!: string;

  @ApiPropertyOptional({ type: Date, nullable: true })
  soldAt?: Date | null;

  @ApiProperty({ type: Date })
  createdAt!: Date;

  @ApiProperty({ type: () => MarketplaceUserSummaryDto })
  seller!: MarketplaceUserSummaryDto;

  @ApiProperty({ type: () => MarketplaceBookSummaryDto })
  book!: MarketplaceBookSummaryDto;
}

export class MarketplaceMessageResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  message!: string;

  @ApiProperty({ type: String })
  senderId!: string;

  @ApiProperty({ type: String })
  senderNom!: string;

  @ApiPropertyOptional({ type: Date, nullable: true })
  readAt?: Date | null;

  @ApiProperty({ type: Date })
  createdAt!: Date;
}
