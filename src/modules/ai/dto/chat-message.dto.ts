import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from "class-validator";

export class ChatHistoryItemDto {
  @ApiProperty({ enum: ["user", "assistant"] })
  @IsIn(["user", "assistant"])
  role!: "user" | "assistant";

  @ApiProperty({ type: String })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content!: string;
}

export class ChatMessageDto {
  @ApiProperty({ example: "Explique ce chapitre simplement." })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message!: string;

  @ApiPropertyOptional({ type: [ChatHistoryItemDto], maxItems: 10 })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryItemDto)
  history?: ChatHistoryItemDto[];

  @ApiPropertyOptional({ example: "8d9d7b88-9f6b-4a35-a5d3-475ce9f43878" })
  @IsOptional()
  @IsUUID()
  bookContextId?: string;
}
