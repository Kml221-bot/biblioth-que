import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: "Diop" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  nom?: string;

  @ApiPropertyOptional({ example: "Aminata" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  prenom?: string;

  @ApiPropertyOptional({ example: "+221771234567" })
  @IsOptional()
  @Matches(/^\+221[0-9]{9}$/)
  whatsappNumber?: string;

  @ApiPropertyOptional({
    example: "https://cdn.bibliotech.sn/avatars/user.png",
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
