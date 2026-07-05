import { ApiPropertyOptional } from "@nestjs/swagger";
import { TypeAcces } from "@prisma/client";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import { PaginationDto } from "../../../common/dto/pagination.dto";

export class FilterBooksDto extends PaginationDto {
  @ApiPropertyOptional({ example: "Informatique & Cybersecurite" })
  @IsOptional()
  @IsString()
  categorie?: string;

  @ApiPropertyOptional({ enum: TypeAcces })
  @IsOptional()
  @IsEnum(TypeAcces)
  typeAcces?: TypeAcces;

  @ApiPropertyOptional({ example: "Genie logiciel" })
  @IsOptional()
  @IsString()
  filiere?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ example: "cybersecurite" })
  @IsOptional()
  @IsString()
  search?: string;
}
