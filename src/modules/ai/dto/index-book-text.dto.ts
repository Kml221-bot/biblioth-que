import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

export class BookPageTextDto {
  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page!: number;

  @ApiProperty({ example: "Texte extrait de la page 1..." })
  @IsString()
  @MaxLength(12000)
  content!: string;
}

export class IndexBookTextDto {
  @ApiProperty({ type: [BookPageTextDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BookPageTextDto)
  pages!: BookPageTextDto[];
}

export class IndexBookTextResponseDto {
  @ApiProperty({ type: String })
  bookId!: string;

  @ApiProperty({ type: Number })
  indexedPages!: number;
}

export class ExtractBookTextResponseDto extends IndexBookTextResponseDto {
  @ApiProperty({ type: String })
  sourceUrl!: string;

  @ApiProperty({ enum: ["pdf", "text"] })
  format!: "pdf" | "text";
}
