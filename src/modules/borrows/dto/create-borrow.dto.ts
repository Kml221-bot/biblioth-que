import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsUUID, Max, Min } from "class-validator";

export class CreateBorrowDto {
  @ApiProperty({ example: "8d9d7b88-9f6b-4a35-a5d3-475ce9f43878" })
  @IsUUID()
  bookId!: string;

  @ApiPropertyOptional({ example: 14, minimum: 1, maximum: 30, default: 14 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  dureeJours = 14;
}
