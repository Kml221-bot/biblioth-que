import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class RegisterDto {
  @ApiProperty({ example: "aminata@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: "BiblioTech2026!",
    description:
      "Minimum 8 caracteres avec majuscule, minuscule, chiffre et symbole.",
  })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, {
    message:
      "Le mot de passe doit contenir une majuscule, une minuscule, un chiffre et un symbole.",
  })
  password!: string;

  @ApiProperty({ example: "Diop" })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  nom!: string;

  @ApiPropertyOptional({ example: "Aminata" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  prenom?: string;

  @ApiPropertyOptional({ example: "+221771234567" })
  @IsOptional()
  @Matches(/^\+221[0-9]{9}$/)
  whatsappNumber?: string;

  @ApiPropertyOptional({ example: "ABCD2026" })
  @IsOptional()
  @Length(8, 8)
  referralCode?: string;
}
