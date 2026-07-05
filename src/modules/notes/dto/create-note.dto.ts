import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { NoteColor, NoteType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";

export class CreateNoteDto {
  @ApiProperty({ example: "8d9d7b88-9f6b-4a35-a5d3-475ce9f43878" })
  @IsUUID()
  bookId!: string;

  @ApiProperty({ example: 12, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page!: number;

  @ApiProperty({ enum: NoteType, example: NoteType.NOTE })
  @IsEnum(NoteType)
  type!: NoteType;

  @ApiPropertyOptional({ example: "Ce passage explique bien le concept." })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  contenu?: string;

  @ApiProperty({ enum: NoteColor, example: NoteColor.YELLOW })
  @IsEnum(NoteColor)
  couleur!: NoteColor;

  @ApiPropertyOptional({ example: "8d9d7b88-9f6b-4a35-a5d3-475ce9f43878" })
  @IsOptional()
  @IsUUID()
  sharedWithCommunityId?: string;
}
