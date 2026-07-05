import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  PaymentProvider,
  PaymentType,
  TransactionStatus,
} from "@prisma/client";

export class PaymentInitiationResponseDto {
  @ApiProperty({ type: String })
  transactionId!: string;

  @ApiProperty({ type: Number })
  montantFcfa!: number;

  @ApiProperty({ type: String })
  currency!: string;

  @ApiProperty({ type: String })
  paymentUrl!: string;
}

export class TransactionResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ enum: PaymentType })
  type!: PaymentType;

  @ApiProperty({ enum: PaymentProvider })
  provider!: PaymentProvider;

  @ApiProperty({ enum: TransactionStatus })
  status!: TransactionStatus;

  @ApiProperty({ type: Number })
  montantTotal!: number;

  @ApiProperty({ type: Number })
  montantCommission!: number;

  @ApiProperty({ type: Number })
  montantVendeur!: number;

  @ApiProperty({ type: String })
  currency!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  paymentUrl?: string | null;

  @ApiProperty({ type: Date })
  createdAt!: Date;

  @ApiPropertyOptional({ type: Date, nullable: true })
  paidAt?: Date | null;
}
