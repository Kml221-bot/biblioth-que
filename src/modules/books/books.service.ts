import { CACHE_MANAGER, Cache } from "@nestjs/cache-manager";
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BookStatus, Prisma, UserRole } from "@prisma/client";
import { PaginationMetaDto } from "../../common/dto/response.dto";
import {
  BookResponseDto,
  BookReviewResponseDto,
  CategoryCountResponseDto,
  CreateBookDto,
  CreateReviewDto,
  FilterBooksDto,
  UpdateBookDto,
} from "./dto";
import { BooksRepository } from "./books.repository";

type BookRecord = Awaited<
  ReturnType<BooksRepository["findManyWithFilters"]>
>[number];
type BookDetailsRecord = NonNullable<
  Awaited<ReturnType<BooksRepository["findOneWithDetails"]>>
>;
type ReviewRecord = Awaited<ReturnType<BooksRepository["createReview"]>>;

const POPULAR_CATEGORY_ORDER = [
  "informatique",
  "cybersecurite",
  "cybersécurité",
  "developpement personnel",
  "développement personnel",
  "litterature africaine",
  "littérature africaine",
  "senegalaise",
  "sénégalaise",
  "economie",
  "économie",
  "business",
  "dark romance",
  "manga",
  "bd",
];

@Injectable()
export class BooksService {
  constructor(
    @Inject(BooksRepository)
    private readonly booksRepository: BooksRepository,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {}

  async findAll(filters: FilterBooksDto, userId?: string) {
    const cacheKey = `books:list:${JSON.stringify({ ...filters, userId: undefined })}`;
    const cached = userId
      ? undefined
      : await this.cacheManager.get<{
          data: BookResponseDto[];
          meta: PaginationMetaDto;
        }>(cacheKey);

    if (cached) {
      return cached;
    }

    const where = this.buildWhere(filters);
    const page = this.toPositiveInteger(filters.page, 1);
    const limit = Math.min(this.toPositiveInteger(filters.limit, 20), 100);
    const skip = (page - 1) * limit;
    const [books, total] = await Promise.all([
      this.booksRepository.findManyWithFilters(
        where,
        this.defaultOrderBy(),
        skip,
        limit,
        filters.cursor
      ),
      this.booksRepository.count(where),
    ]);

    const sortedBooks = this.sortBySurveyPriority(books);
    const data = await this.withUserAccess(
      sortedBooks.map(book => this.toBookResponse(book)),
      userId
    );
    const result = {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        nextCursor:
          books.length === limit ? books[books.length - 1].id : undefined,
      },
    };

    if (!userId) {
      await this.cacheManager.set(cacheKey, result, 300_000);
    }

    return result;
  }

  async findFeatured() {
    const cacheKey = "books:featured";
    const cached = await this.cacheManager.get<BookResponseDto[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const books = await this.booksRepository.findManyWithFilters(
      {
        status: BookStatus.PUBLISHED,
        featured: true,
      },
      [{ nbEmprunts: "desc" }, { noteMoyenne: "desc" }, { createdAt: "desc" }],
      0,
      6
    );
    const result = this.sortBySurveyPriority(books)
      .slice(0, 6)
      .map(book => this.toBookResponse(book));

    await this.cacheManager.set(cacheKey, result, 600_000);

    return result;
  }

  async getCategories(): Promise<CategoryCountResponseDto[]> {
    const cacheKey = "books:categories";
    const cached =
      await this.cacheManager.get<CategoryCountResponseDto[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const categories = await this.booksRepository.getCategoriesWithCounters();
    const result = categories
      .map(category => ({
        categorie: category.categorie,
        count: category._count.categorie,
      }))
      .sort(
        (a, b) =>
          this.getCategoryRank(a.categorie) - this.getCategoryRank(b.categorie)
      );

    await this.cacheManager.set(cacheKey, result, 600_000);

    return result;
  }

  async searchBooks(query: string, filters: FilterBooksDto, userId?: string) {
    const result = await this.findAll(
      {
        ...filters,
        search: query,
        page: filters.page ?? 1,
        limit: filters.limit ?? 20,
      },
      userId
    );

    return {
      ...result,
      suggestions:
        result.data.length > 0 ? [] : await this.getSearchSuggestions(query),
    };
  }

  async findOne(id: string, userId?: string) {
    const book = await this.booksRepository.findOneWithDetails(id);

    if (!book) {
      throw new NotFoundException("Livre introuvable");
    }

    void this.booksRepository.incrementViews(id).catch(() => undefined);

    const response = this.toBookResponse(book);
    const [withAccess] = await this.withUserAccess([response], userId);

    return withAccess;
  }

  async create(dto: CreateBookDto, role: UserRole) {
    const status =
      role === UserRole.ADMIN ? BookStatus.PUBLISHED : BookStatus.PENDING;
    const book = await this.booksRepository.create({
      titre: dto.titre,
      auteur: dto.auteur,
      categorie: dto.categorie,
      filiere: dto.filiere,
      description: dto.description,
      typeAcces: dto.typeAcces,
      status,
      prixAchat: dto.prixAchat ?? 2000,
      prixLocation7j: dto.prixLocation7j ?? 500,
      prixLocation30j: dto.prixLocation30j ?? 800,
    });

    await this.invalidateCatalogueCache();

    return this.toBookResponse(book);
  }

  async update(id: string, dto: UpdateBookDto) {
    await this.ensureBookExists(id);
    const book = await this.booksRepository.update(id, dto);

    await this.invalidateCatalogueCache();

    return this.toBookResponse(book);
  }

  async delete(id: string) {
    await this.ensureBookExists(id);
    await this.booksRepository.delete(id);
    await this.invalidateCatalogueCache();
  }

  async createReview(bookId: string, userId: string, dto: CreateReviewDto) {
    await this.ensureBookExists(bookId);

    const access = await this.booksRepository.findUserBookAccess(
      userId,
      bookId
    );

    if (!access.hasAccess) {
      throw new ForbiddenException(
        "Vous devez avoir emprunte ou achete ce livre pour laisser un avis"
      );
    }

    const existingReview = await this.booksRepository.findReviewByUserAndBook(
      userId,
      bookId
    );

    if (existingReview) {
      throw new ConflictException("Vous avez deja laisse un avis sur ce livre");
    }

    const review = await this.booksRepository.createReview({
      userId,
      bookId,
      note: dto.note,
      commentaire: dto.commentaire,
    });

    await this.invalidateCatalogueCache();

    return this.toReviewResponse(review);
  }

  async deleteReview(bookId: string, userId: string) {
    const existingReview = await this.booksRepository.findReviewByUserAndBook(
      userId,
      bookId
    );

    if (!existingReview) {
      throw new NotFoundException("Avis introuvable");
    }

    await this.booksRepository.deleteReview(bookId, userId);
    await this.invalidateCatalogueCache();
  }

  private buildWhere(filters: FilterBooksDto): Prisma.BookWhereInput {
    const where: Prisma.BookWhereInput = {
      status: BookStatus.PUBLISHED,
    };

    if (filters.categorie) {
      where.categorie = { contains: filters.categorie, mode: "insensitive" };
    }

    if (filters.typeAcces) {
      where.typeAcces = filters.typeAcces;
    }

    if (filters.filiere) {
      where.filiere = { contains: filters.filiere, mode: "insensitive" };
    }

    if (typeof filters.featured === "boolean") {
      where.featured = filters.featured;
    }

    if (filters.search) {
      where.OR = [
        { titre: { contains: filters.search, mode: "insensitive" } },
        { auteur: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { categorie: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    return where;
  }

  private defaultOrderBy(): Prisma.BookOrderByWithRelationInput[] {
    return [
      { featured: "desc" },
      { nbEmprunts: "desc" },
      { noteMoyenne: "desc" },
      { createdAt: "desc" },
    ];
  }

  private sortBySurveyPriority<T extends { categorie: string }>(books: T[]) {
    return [...books].sort(
      (a, b) =>
        this.getCategoryRank(a.categorie) - this.getCategoryRank(b.categorie)
    );
  }

  private getCategoryRank(category: string) {
    const normalizedCategory = this.normalize(category);
    const index = POPULAR_CATEGORY_ORDER.findIndex(candidate =>
      normalizedCategory.includes(this.normalize(candidate))
    );

    return index === -1 ? 999 : index;
  }

  private async withUserAccess(books: BookResponseDto[], userId?: string) {
    if (!userId || books.length === 0) {
      return books;
    }

    const accessMap = await this.booksRepository.findUserBookAccessMap(
      userId,
      books.map(book => book.id)
    );

    return books.map(book => ({
      ...book,
      isAlreadyBorrowed: accessMap.borrowedBookIds.has(book.id),
      isAlreadyPurchased: accessMap.purchasedBookIds.has(book.id),
    }));
  }

  private async ensureBookExists(id: string) {
    const book = await this.booksRepository.findRawById(id);

    if (!book) {
      throw new NotFoundException("Livre introuvable");
    }

    return book;
  }

  private async getSearchSuggestions(query: string) {
    const categories = await this.getCategories();
    const normalizedQuery = this.normalize(query);

    return categories
      .filter(category =>
        this.normalize(category.categorie).includes(normalizedQuery.slice(0, 4))
      )
      .slice(0, 5)
      .map(category => category.categorie);
  }

  private toBookResponse(
    book: BookRecord | BookDetailsRecord
  ): BookResponseDto {
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
      authorProfile: book.authorProfile
        ? {
            id: book.authorProfile.id,
            nom: book.authorProfile.user.nom,
            prenom: book.authorProfile.user.prenom,
          }
        : null,
      reviews:
        "reviews" in book
          ? book.reviews.map(review => this.toReviewResponse(review))
          : undefined,
    };
  }

  private toReviewResponse(review: ReviewRecord): BookReviewResponseDto {
    return {
      id: review.id,
      note: review.note,
      commentaire: review.commentaire,
      createdAt: review.createdAt,
      user: {
        id: review.user.id,
        nom: review.user.nom,
        prenom: review.user.prenom,
      },
    };
  }

  private async invalidateCatalogueCache() {
    await Promise.all([
      this.cacheManager.del("books:featured"),
      this.cacheManager.del("books:categories"),
    ]);
  }

  private toPositiveInteger(value: unknown, fallback: number) {
    const parsedValue =
      typeof value === "number" ? value : Number.parseInt(String(value), 10);

    if (!Number.isInteger(parsedValue) || parsedValue < 1) {
      return fallback;
    }

    return parsedValue;
  }

  private normalize(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }
}
