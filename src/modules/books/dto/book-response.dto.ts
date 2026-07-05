import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BookStatus, TypeAcces } from "@prisma/client";

export class AuthorProfileSummaryDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  nom!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  prenom?: string | null;
}

export class BookReviewResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: Number })
  note!: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  commentaire?: string | null;

  @ApiProperty({ type: Date })
  createdAt!: Date;

  @ApiProperty({ type: AuthorProfileSummaryDto })
  user!: AuthorProfileSummaryDto;
}

export class BookResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  titre!: string;

  @ApiProperty({ type: String })
  auteur!: string;

  @ApiProperty({ type: String })
  categorie!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  filiere?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  description?: string | null;

  @ApiProperty({ enum: TypeAcces })
  typeAcces!: TypeAcces;

  @ApiProperty({ enum: BookStatus })
  status!: BookStatus;

  @ApiProperty({ type: Number })
  prixAchat!: number;

  @ApiProperty({ type: Number })
  prixLocation7j!: number;

  @ApiProperty({ type: Number })
  prixLocation30j!: number;

  @ApiProperty({ type: Number })
  noteMoyenne!: number;

  @ApiProperty({ type: Number })
  reviewsCount!: number;

  @ApiProperty({ type: Number })
  nbVues!: number;

  @ApiProperty({ type: Number })
  nbEmprunts!: number;

  @ApiProperty({ type: Boolean })
  featured!: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  coverUrl?: string | null;

  @ApiPropertyOptional({ type: Boolean })
  isAlreadyBorrowed?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  isAlreadyPurchased?: boolean;

  @ApiPropertyOptional({ type: [BookReviewResponseDto] })
  reviews?: BookReviewResponseDto[];

  @ApiPropertyOptional({ type: AuthorProfileSummaryDto })
  authorProfile?: AuthorProfileSummaryDto | null;
}

export class CategoryCountResponseDto {
  @ApiProperty({ type: String })
  categorie!: string;

  @ApiProperty({ type: Number })
  count!: number;
}
