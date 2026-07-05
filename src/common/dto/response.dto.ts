import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PaginationMetaDto {
  @ApiProperty({ type: Number })
  total!: number;

  @ApiProperty({ type: Number })
  page!: number;

  @ApiProperty({ type: Number })
  limit!: number;

  @ApiProperty({ type: Number })
  totalPages!: number;

  @ApiPropertyOptional({ type: String })
  nextCursor?: string;
}

export class ResponseDto<T> {
  @ApiProperty({ type: Boolean, example: true })
  success!: boolean;

  @ApiPropertyOptional({ type: Object })
  data?: T;

  @ApiPropertyOptional({ type: String })
  message?: string;

  @ApiPropertyOptional({ type: PaginationMetaDto })
  meta?: PaginationMetaDto;

  static ok<T>(
    data: T,
    message?: string,
    meta?: PaginationMetaDto
  ): ResponseDto<T> {
    return { success: true, data, message, meta };
  }

  static created<T>(
    data: T,
    message = "Ressource creee avec succes"
  ): ResponseDto<T> {
    return { success: true, data, message };
  }
}

export class ErrorResponseDto {
  @ApiProperty({ type: Boolean, example: false })
  success!: false;

  @ApiProperty({ type: String })
  error!: string;

  @ApiProperty({ type: String })
  code!: string;

  @ApiProperty({ type: Number })
  statusCode!: number;

  @ApiProperty({ type: String })
  timestamp!: string;

  @ApiProperty({ type: String })
  path!: string;

  @ApiPropertyOptional({ type: Object })
  details?: unknown;
}
