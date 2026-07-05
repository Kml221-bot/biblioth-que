import { ApiPropertyOptional } from "@nestjs/swagger";
import { BookStatus, TypeAcces } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export class UpdateBookDto {
  @ApiPropertyOptional({ example: "Introduction a la cybersecurite" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  titre?: string;

  @ApiPropertyOptional({ example: "Mouhamadou Kane" })
  @IsOptional()
  @IsString()
  auteur?: string;

  @ApiPropertyOptional({ example: "Informatique & Cybersecurite" })
  @IsOptional()
  @IsString()
  categorie?: string;

  @ApiPropertyOptional({ enum: TypeAcces })
  @IsOptional()
  @IsEnum(TypeAcces)
  typeAcces?: TypeAcces;

  @ApiPropertyOptional({ enum: BookStatus })
  @IsOptional()
  @IsEnum(BookStatus)
  status?: BookStatus;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ example: 2000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  prixAchat?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  prixLocation7j?: number;

  @ApiPropertyOptional({ example: 800 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  prixLocation30j?: number;
}
