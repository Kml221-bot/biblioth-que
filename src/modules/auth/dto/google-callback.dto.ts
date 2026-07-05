import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class GoogleCallbackDto {
  @ApiProperty({
    description: "Access token Supabase obtenu apres OAuth Google.",
  })
  @IsString()
  @IsNotEmpty()
  accessToken!: string;
}
