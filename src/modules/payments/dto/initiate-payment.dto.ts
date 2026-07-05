import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaymentType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID } from "class-validator";

export class InitiatePaymentDto {
  @ApiProperty({ enum: PaymentType, example: PaymentType.BORROW })
  @IsEnum(PaymentType)
  type!: PaymentType;

  @ApiPropertyOptional({ example: "8d9d7b88-9f6b-4a35-a5d3-475ce9f43878" })
  @IsOptional()
  @IsUUID()
  bookId?: string;

  @ApiPropertyOptional({ example: "8d9d7b88-9f6b-4a35-a5d3-475ce9f43878" })
  @IsOptional()
  @IsUUID()
  listingId?: string;

  @ApiPropertyOptional({ example: "8d9d7b88-9f6b-4a35-a5d3-475ce9f43878" })
  @IsOptional()
  @IsUUID()
  penaltyId?: string;

  @ApiPropertyOptional({ example: 30, enum: [7, 14, 21, 30] })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([7, 14, 21, 30])
  durationDays?: number;

  @ApiPropertyOptional({
    example: "pack_100",
    description: "Pack BiblioCoins pour WALLET_RECHARGE",
    enum: ["pack_30", "pack_100", "pack_250", "pack_500"],
  })
  @IsOptional()
  @IsString()
  @IsIn(["pack_30", "pack_100", "pack_250", "pack_500"])
  packId?: string;
}
