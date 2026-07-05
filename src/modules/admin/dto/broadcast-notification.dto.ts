import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { NotificationChannel } from "@prisma/client";
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class BroadcastNotificationDto {
  @ApiProperty({ type: String, example: "Nouvelle selection BiblioTech" })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @ApiProperty({
    type: String,
    example: "Decouvre les nouveaux livres Informatique & Cybersecurite.",
  })
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  message!: string;

  @ApiPropertyOptional({
    enum: NotificationChannel,
    default: NotificationChannel.IN_APP,
  })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel: NotificationChannel = NotificationChannel.IN_APP;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
