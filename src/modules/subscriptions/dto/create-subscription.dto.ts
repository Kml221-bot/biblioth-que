import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SubscriptionPlan } from "@prisma/client";
import { IsBoolean, IsEnum, IsOptional } from "class-validator";

export class CreateSubscriptionDto {
  @ApiProperty({
    enum: SubscriptionPlan,
    example: SubscriptionPlan.STUDENT,
    description: "Plan d'abonnement choisi",
  })
  @IsEnum(SubscriptionPlan)
  plan!: SubscriptionPlan;

  @ApiPropertyOptional({
    example: true,
    description: "Renouvellement automatique",
  })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}
