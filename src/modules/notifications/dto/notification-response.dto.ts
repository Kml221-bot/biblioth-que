import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { NotificationChannel, NotificationStatus } from "@prisma/client";

export class NotificationResponseDto {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ enum: NotificationChannel })
  channel!: NotificationChannel;

  @ApiProperty({ enum: NotificationStatus })
  status!: NotificationStatus;

  @ApiProperty({ type: String })
  title!: string;

  @ApiProperty({ type: String })
  message!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  template?: string | null;

  @ApiPropertyOptional({ type: Date, nullable: true })
  sentAt?: Date | null;

  @ApiPropertyOptional({ type: Date, nullable: true })
  readAt?: Date | null;

  @ApiProperty({ type: Date })
  createdAt!: Date;
}
