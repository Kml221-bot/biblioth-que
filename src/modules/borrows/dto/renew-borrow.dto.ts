import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt } from "class-validator";

export class RenewBorrowDto {
  @ApiProperty({ example: 7, enum: [7, 14] })
  @Type(() => Number)
  @IsInt()
  @IsIn([7, 14])
  dureeJours!: 7 | 14;
}
