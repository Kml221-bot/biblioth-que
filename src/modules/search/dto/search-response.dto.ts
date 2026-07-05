import { ApiProperty } from "@nestjs/swagger";
import { BookResponseDto } from "../../books/dto";

export class SearchBookResponseDto extends BookResponseDto {
  @ApiProperty({ type: Number })
  relevanceScore!: number;
}

export class SearchResultsResponseDto {
  @ApiProperty({ type: SearchBookResponseDto, isArray: true })
  items!: SearchBookResponseDto[];

  @ApiProperty({ type: String, isArray: true })
  suggestions!: string[];
}
