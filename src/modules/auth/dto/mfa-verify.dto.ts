import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Length } from "class-validator";

export class MfaVerifyDto {
  @ApiProperty({ example: "factor-id" })
  @IsString()
  @IsNotEmpty()
  factorId!: string;

  @ApiProperty({ example: "123456" })
  @IsString()
  @Length(6, 6)
  code!: string;
}
