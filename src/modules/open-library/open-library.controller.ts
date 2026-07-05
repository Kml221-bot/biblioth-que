import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  Query,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ResponseDto } from "../../common/dto/response.dto";
import { OpenLibraryBookDto, OpenLibrarySearchResultDto } from "./dto";
import { OpenLibraryService } from "./open-library.service";

@Controller("open-library")
@ApiTags("Open Library")
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class OpenLibraryController {
  constructor(
    @Inject(OpenLibraryService)
    private readonly openLibraryService: OpenLibraryService
  ) {}

  @Get("search")
  @ApiOperation({
    summary: "Rechercher des livres sur Open Library (gratuit, sans clé API)",
    description:
      "Utilise l'API publique Open Library. Résultats mis en cache Redis 1h. " +
      "Idéal pour auto-compléter le formulaire d'ajout de livres côté admin.",
  })
  @ApiQuery({ name: "q", required: true, description: "Titre, auteur ou ISBN" })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Résultats à retourner (1–20, défaut: 10)",
  })
  @ApiResponse({
    status: 200,
    description: "Résultats de recherche Open Library",
    type: OpenLibrarySearchResultDto,
  })
  async search(
    @Query("q") q: string,
    @Query("limit") limit?: string
  ) {
    if (!q?.trim()) {
      throw new BadRequestException("Le paramètre q est requis");
    }
    const parsedLimit = limit ? Math.min(Number(limit), 20) : 10;
    return ResponseDto.ok(
      await this.openLibraryService.searchBooks(q, parsedLimit)
    );
  }

  @Get("isbn/:isbn")
  @ApiOperation({
    summary: "Récupérer les métadonnées complètes d'un livre via son ISBN",
    description:
      "Retourne titre, auteurs, éditeur, couverture, sujets. Cache Redis 1h.",
  })
  @ApiParam({
    name: "isbn",
    description: "ISBN-10 ou ISBN-13 (avec ou sans tirets)",
    example: "9782070360437",
  })
  @ApiResponse({
    status: 200,
    description: "Métadonnées du livre",
    type: OpenLibraryBookDto,
  })
  async getByIsbn(@Param("isbn") isbn: string) {
    return ResponseDto.ok(await this.openLibraryService.getByIsbn(isbn));
  }
}
