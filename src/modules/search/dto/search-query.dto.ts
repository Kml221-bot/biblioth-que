import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { TypeAcces } from "@prisma/client";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export enum SearchOrder {
  RELEVANCE = "pertinence",
  POPULARITY = "popularite",
  RATING = "note",
  DATE = "date",
}

export class SearchQueryDto extends PaginationDto {
  @ApiPropertyOptional({ example: "cybersecurite" })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: "Informatique & Cybersecurite" })
  @IsOptional()
  @IsString()
  categorie?: string;

  @ApiPropertyOptional({ enum: TypeAcces })
  @IsOptional()
  @IsEnum(TypeAcces)
  typeAcces?: TypeAcces;

  @ApiPropertyOptional({ example: "Genie logiciel" })
  @IsOptional()
  @IsString()
  filiere?: string;

  @ApiPropertyOptional({ name: "prix_max", example: 2000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  prix_max?: number;

  @ApiPropertyOptional({ enum: SearchOrder, default: SearchOrder.RELEVANCE })
  @IsOptional()
  @IsEnum(SearchOrder)
  order: SearchOrder = SearchOrder.RELEVANCE;
}

export class SearchSuggestionsQueryDto {
  @ApiProperty({ type: String, example: "cyber" })
  @IsString()
  q!: string;
}
