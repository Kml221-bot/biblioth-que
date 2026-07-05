import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDecimal, IsInt, Max, Min } from "class-validator";

export class UpdateProgressDto {
  @ApiProperty({ example: 42, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageActuelle!: number;

  @ApiProperty({ example: "37.50", minimum: 0, maximum: 100 })
  @IsDecimal({ decimal_digits: "0,2" })
  pourcentageLu!: string;

  @ApiProperty({ example: 12, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  dureeMinutes!: number;
}
