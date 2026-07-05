import { CACHE_MANAGER, Cache } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { PaginationMetaDto } from "../../common/dto/response.dto";
import { SearchRepository } from "./search.repository";
import {
  SearchBookResponseDto,
  SearchOrder,
  SearchQueryDto,
} from "./dto";

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @Inject(SearchRepository) private readonly repository: SearchRepository,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {}

  async search(query: SearchQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const normalizedQuery = query.q?.trim() ?? "";
    const [rows, total] = await Promise.all([
      this.repository.searchBookIds(query, (page - 1) * limit, limit),
      this.repository.countSearchResults(query),
    ]);
    const ids = rows.map(row => row.id);
    const books = await this.repository.findBooksByIds(ids);
    const scoreById = new Map(rows.map(row => [row.id, row.score]));
    const bookById = new Map(books.map(book => [book.id, book]));
    const orderedBooks = ids
      .map(id => bookById.get(id))
      .filter(
        (
          book
        ): book is Awaited<
          ReturnType<SearchRepository["findBooksByIds"]>
        >[number] => Boolean(book)
      );
    const data = orderedBooks.map(book =>
      this.toSearchBookResponse(book, scoreById.get(book.id) ?? 0)
    );
    const suggestions =
      data.length === 0 && normalizedQuery
        ? await this.getSuggestions(normalizedQuery)
        : [];
    const meta: PaginationMetaDto = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      nextCursor: data.length === limit ? data[data.length - 1]?.id : undefined,
    };

    this.logAnonymizedSearch(
      normalizedQuery,
      query.order ?? SearchOrder.RELEVANCE
    );

    return {
      data,
      suggestions,
      meta,
    };
  }

  async getSuggestions(query: string) {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return [];
    }

    const cacheKey = `search:suggestions:${normalizedQuery}`;
    const cached = await this.cacheManager.get<string[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const suggestions = await this.loadSuggestions(normalizedQuery);

    await this.cacheManager.set(cacheKey, suggestions, 60_000);

    return suggestions;
  }

  private async loadSuggestions(query: string) {
    try {
      const rows = await this.repository.findTrigramSuggestions(query);
      const suggestions = rows.map(row => row.suggestion).filter(Boolean);

      if (suggestions.length > 0) {
        return uniqueFirstFive(suggestions);
      }
    } catch (error) {
      this.logger.warn(
        "Suggestions pg_trgm indisponibles, fallback simple active"
      );
    }

    const fallbackRows = await this.repository.findSimpleSuggestions(query);

    return uniqueFirstFive(
      fallbackRows.flatMap(row => [row.titre, row.auteur]).filter(Boolean)
    );
  }

  private logAnonymizedSearch(query: string, order: SearchOrder) {
    if (!query) {
      return;
    }

    this.logger.debug(
      `Recherche anonymisee len=${query.length} order=${order}`
    );
  }

  private toSearchBookResponse(
    book: Awaited<ReturnType<SearchRepository["findBooksByIds"]>>[number],
    score: number
  ): SearchBookResponseDto {
    return {
      id: book.id,
      titre: book.titre,
      auteur: book.auteur,
      categorie: book.categorie,
      filiere: book.filiere,
      description: book.description,
      typeAcces: book.typeAcces as import("@prisma/client").TypeAcces,
      status: book.status,
      prixAchat: book.prixAchat,
      prixLocation7j: book.prixLocation7j,
      prixLocation30j: book.prixLocation30j,
      noteMoyenne: Number(book.noteMoyenne),
      reviewsCount: book.reviewsCount,
      nbVues: book.nbVues,
      nbEmprunts: book.nbEmprunts,
      featured: book.featured,
      coverUrl: book.coverUrl,
      relevanceScore: Number(score.toFixed(4)),
      authorProfile: book.authorProfile
        ? {
            id: book.authorProfile.id,
            nom: book.authorProfile.user.nom,
            prenom: book.authorProfile.user.prenom,
          }
        : null,
    };
  }
}

function uniqueFirstFive(values: string[]) {
  return Array.from(
    new Set(values.map(value => value.trim()).filter(Boolean))
  ).slice(0, 5);
}
