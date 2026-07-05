import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateReviewDto {
  @ApiProperty({ type: Number, example: 4, description: "Note de 1 a 5" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  note!: number;

  @ApiPropertyOptional({ type: String, example: "Excellent livre, tres pedagogique !" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  commentaire?: string;
}

export class UpdateReviewDto {
  @ApiPropertyOptional({ type: Number, example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  note?: number;

  @ApiPropertyOptional({ type: String, example: "Mis a jour apres relecture" })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  commentaire?: string;
}

export class ReviewAuthorDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: String }) nom!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) prenom?: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) avatarUrl?: string | null;
}

export class ReviewResponseDto {
  @ApiProperty({ type: String }) id!: string;
  @ApiProperty({ type: Number }) note!: number;
  @ApiPropertyOptional({ type: String, nullable: true }) commentaire?: string | null;
  @ApiProperty({ type: String }) createdAt!: Date;
  @ApiProperty({ type: String }) updatedAt!: Date;
  @ApiProperty({ type: () => ReviewAuthorDto }) user!: ReviewAuthorDto;
}

export class BookRatingDto {
  @ApiProperty({ type: String }) bookId!: string;
  @ApiProperty({ type: Number }) noteMoyenne!: number;
  @ApiProperty({ type: Number }) totalReviews!: number;
  @ApiProperty({ type: Object }) distribution!: Record<string, number>;
}
