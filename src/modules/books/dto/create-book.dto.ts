import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TypeAcces } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export class CreateBookDto {
  @ApiProperty({ example: "Introduction a la cybersecurite" })
  @IsString()
  @MinLength(2)
  titre!: string;

  @ApiProperty({ example: "Mouhamadou Kane" })
  @IsString()
  auteur!: string;

  @ApiProperty({ example: "Informatique & Cybersecurite" })
  @IsString()
  categorie!: string;

  @ApiProperty({ enum: TypeAcces })
  @IsEnum(TypeAcces)
  typeAcces!: TypeAcces;

  @ApiPropertyOptional({ example: "Genie logiciel" })
  @IsOptional()
  @IsString()
  filiere?: string;

  @ApiPropertyOptional({
    example: "Guide pratique pour demarrer en securite informatique.",
  })
  @IsOptional()
  @IsString()
  description?: string;

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
