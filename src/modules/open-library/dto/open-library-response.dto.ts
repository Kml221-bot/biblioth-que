import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class OpenLibraryBookDto {
  @ApiProperty({ type: String, example: "/works/OL45804W" })
  key!: string;

  @ApiProperty({ type: String, example: "Candide ou l'Optimisme" })
  title!: string;

  @ApiPropertyOptional({ type: [String], example: ["Voltaire"] })
  authors?: string[];

  @ApiPropertyOptional({ type: Number, example: 1759 })
  publishYear?: number;

  @ApiPropertyOptional({ type: Number, example: 128, description: "Nombre de pages médian" })
  pages?: number;

  @ApiPropertyOptional({ type: [String], example: ["978-2-07-036043-3"] })
  isbn?: string[];

  @ApiPropertyOptional({ type: [String], example: ["Philosophical fiction", "Satire"] })
  subjects?: string[];

  @ApiPropertyOptional({ type: String, nullable: true, example: "https://covers.openlibrary.org/b/id/8393898-M.jpg" })
  coverUrl?: string | null;

  @ApiPropertyOptional({ type: String, example: "Gallimard" })
  publisher?: string;
}

export class OpenLibrarySearchResultDto {
  @ApiProperty({ type: Number, example: 42, description: "Nombre total de résultats OpenLibrary" })
  total!: number;

  @ApiProperty({ type: () => [OpenLibraryBookDto] })
  books!: OpenLibraryBookDto[];
}
