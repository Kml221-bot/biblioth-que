import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class CreateReviewDto {
  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  note!: number;

  @ApiPropertyOptional({ example: "Tres utile pour comprendre les bases." })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  commentaire?: string;
}
