import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class CreateAuthorProfileDto {
  @ApiPropertyOptional({ example: "Developpeur fullstack et auteur technique" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @ApiPropertyOptional({ example: "+221770001122" })
  @IsOptional()
  @Matches(/^\+221[0-9]{9}$/, {
    message: "Le compte Wave doit etre au format +221XXXXXXXXX",
  })
  waveAccount?: string;
}

export class UpdateAuthorProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^\+221[0-9]{9}$/)
  waveAccount?: string;
}

export class AuthorUserSummaryDto {
  @ApiProperty({ type: String })
  nom!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  prenom!: string | null;

  @ApiProperty({ type: String })
  email!: string;
}

export class AuthorProfileResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  userId!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  bio?: string | null;

  @ApiProperty({ type: String })
  status!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  waveAccount?: string | null;

  @ApiProperty({ type: Number })
  soldeDisponible!: number;

  @ApiProperty({ type: Number })
  commissionPct!: number;

  @ApiPropertyOptional({ type: Date, nullable: true })
  approvedAt?: Date | null;

  @ApiProperty({ type: Date })
  createdAt!: Date;

  @ApiPropertyOptional({ type: () => AuthorUserSummaryDto })
  user?: AuthorUserSummaryDto;

  @ApiProperty({ type: Number })
  booksCount!: number;
}
