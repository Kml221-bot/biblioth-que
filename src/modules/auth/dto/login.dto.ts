import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "aminata@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "BiblioTech2026!" })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
