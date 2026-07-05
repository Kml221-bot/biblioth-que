import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import { CommunityVisibility } from "@prisma/client";

export class CreateCommunityDto {
  @ApiProperty({ example: "Club Lecture Informatique" })
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  nom!: string;

  @ApiPropertyOptional({ example: "Communaute pour les passionnes d'informatique" })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: CommunityVisibility, default: "PUBLIC" })
  @IsOptional()
  @IsEnum(CommunityVisibility)
  visibility?: CommunityVisibility;
}

export class UpdateCommunityDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  nom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ enum: CommunityVisibility })
  @IsOptional()
  @IsEnum(CommunityVisibility)
  visibility?: CommunityVisibility;
}

export class CreatePostDto {
  @ApiProperty({ example: "Quelqu'un a lu le dernier livre de..." })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  contenu!: string;
}

export class CommunityUserSummaryDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  nom!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  prenom!: string | null;
}

export class CommunityResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  nom!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  description?: string | null;

  @ApiProperty({ type: String })
  visibility!: string;

  @ApiProperty({ type: Date })
  createdAt!: Date;

  @ApiProperty({ type: () => CommunityUserSummaryDto })
  owner!: CommunityUserSummaryDto;

  @ApiProperty({ type: Number })
  membersCount!: number;

  @ApiProperty({ type: Number })
  postsCount!: number;
}

export class CommunityMemberResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  userId!: string;

  @ApiProperty({ type: String })
  nom!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  prenom?: string | null;

  @ApiProperty({ type: String })
  role!: string;

  @ApiProperty({ type: Date })
  joinedAt!: Date;
}

export class PostResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  contenu!: string;

  @ApiProperty({ type: String })
  status!: string;

  @ApiProperty({ type: Date })
  createdAt!: Date;

  @ApiProperty({ type: () => CommunityUserSummaryDto })
  author!: CommunityUserSummaryDto;
}
