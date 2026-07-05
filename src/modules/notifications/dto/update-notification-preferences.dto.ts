import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  whatsapp?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  sms?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  push?: boolean;
}

export class NotificationPreferencesResponseDto {
  @ApiPropertyOptional({ type: Boolean })
  whatsapp!: boolean;

  @ApiPropertyOptional({ type: Boolean })
  email!: boolean;

  @ApiPropertyOptional({ type: Boolean })
  sms!: boolean;

  @ApiPropertyOptional({ type: Boolean })
  push!: boolean;
}
