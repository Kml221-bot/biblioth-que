import { ApiPropertyOptional } from "@nestjs/swagger";
import { NoteColor, NoteType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class UpdateNoteDto {
  @ApiPropertyOptional({ example: 12, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ enum: NoteType })
  @IsOptional()
  @IsEnum(NoteType)
  type?: NoteType;

  @ApiPropertyOptional({ example: "Note mise a jour." })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  contenu?: string;

  @ApiPropertyOptional({ enum: NoteColor })
  @IsOptional()
  @IsEnum(NoteColor)
  couleur?: NoteColor;
}
