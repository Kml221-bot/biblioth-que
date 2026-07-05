import { Controller, Get, Inject, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ResponseDto } from "../../common/dto/response.dto";
import { SearchService } from "./search.service";
import {
  SearchQueryDto,
  SearchResultsResponseDto,
  SearchSuggestionsQueryDto,
} from "./dto";

@Controller("search")
@ApiTags("Search")
export class SearchController {
  constructor(
    @Inject(SearchService) private readonly searchService: SearchService
  ) {}

  @Get()
  @ApiOperation({
    summary: "Rechercher des livres avec full-text et filtres catalogue",
  })
  @ApiResponse({
    status: 200,
    description: "Resultats de recherche pagines",
    type: SearchResultsResponseDto,
  })
  async search(@Query() query: SearchQueryDto) {
    const result = await this.searchService.search(query);

    return ResponseDto.ok(
      {
        items: result.data,
        suggestions: result.suggestions,
      },
      undefined,
      result.meta
    );
  }

  @Get("suggestions")
  @ApiOperation({ summary: "Retourner 5 suggestions d'autocompletion" })
  @ApiResponse({
    status: 200,
    description: "Suggestions rapides",
    type: String,
    isArray: true,
  })
  async getSuggestions(@Query() query: SearchSuggestionsQueryDto) {
    return ResponseDto.ok(await this.searchService.getSuggestions(query.q));
  }
}
