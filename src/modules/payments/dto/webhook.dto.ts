import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

/**
 * Naboopay v2 webhook payload DTO.
 * All fields optional to handle various webhook formats gracefully.
 */
export class WebhookDto {
  @ApiPropertyOptional({ type: String, description: "Naboopay v2 order ID" })
  @IsString()
  @IsOptional()
  order_id?: string;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  transaction_id?: string;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  merchant_transaction_id?: string;

  @ApiPropertyOptional({ type: Number })
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ type: Number, description: "Naboopay v2 uses 'price' instead of 'amount'" })
  @IsOptional()
  price?: number;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: "SUCCESS", description: "SUCCESS, FAILED, PENDING, CANCELLED" })
  @IsString()
  status!: string;

  @ApiPropertyOptional({ type: String })
  @IsString()
  @IsOptional()
  payment_method?: string;

  @ApiPropertyOptional({ type: String, description: "Naboopay v2 method_of_payment" })
  @IsString()
  @IsOptional()
  method_of_payment?: string;
}
