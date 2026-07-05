import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from "class-validator";
import { UserRole, UserStatus } from "@prisma/client";

export class UpdateUserDto {
  @ApiPropertyOptional({ example: "Kane" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  nom?: string;

  @ApiPropertyOptional({ example: "Mouhamadou" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  prenom?: string;

  @ApiPropertyOptional({ example: "+221770001122" })
  @IsOptional()
  @Matches(/^\+221[0-9]{9}$/, {
    message: "Le numero WhatsApp doit etre au format +221XXXXXXXXX",
  })
  whatsappNumber?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
