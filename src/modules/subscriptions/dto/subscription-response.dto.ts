import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

export class SubscriptionResponseDto {
  @ApiProperty({ type: String, example: "uuid-v4" })
  id!: string;

  @ApiProperty({ enum: SubscriptionPlan, example: SubscriptionPlan.STUDENT })
  plan!: SubscriptionPlan;

  @ApiProperty({ enum: SubscriptionStatus, example: SubscriptionStatus.ACTIVE })
  status!: SubscriptionStatus;

  @ApiProperty({ type: Number, example: 3 })
  empruntsRestants!: number;

  @ApiProperty({ type: Boolean, example: true })
  autoRenew!: boolean;

  @ApiProperty({ type: String, example: "2026-01-01T00:00:00.000Z" })
  startsAt!: Date;

  @ApiPropertyOptional({ type: String, nullable: true, example: "2026-02-01T00:00:00.000Z" })
  endsAt?: Date | null;

  @ApiProperty({ type: String, example: "2026-01-01T00:00:00.000Z" })
  createdAt!: Date;
}
