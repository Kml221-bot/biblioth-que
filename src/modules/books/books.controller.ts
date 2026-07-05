import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser, Roles } from "../../common/decorators";
import { ApiPaginatedResponse } from "../../common/decorators/api-paginated-response.decorator";
import { ResponseDto } from "../../common/dto/response.dto";
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
  RolesGuard,
} from "../../common/guards";
import { AuthenticatedRequestUser } from "../auth/types/auth.types";
import { BooksService } from "./books.service";
import {
  BookResponseDto,
  BookReviewResponseDto,
  CategoryCountResponseDto,
  CreateBookDto,
  CreateReviewDto,
  FilterBooksDto,
  UpdateBookDto,
} from "./dto";

@Controller("books")
@ApiTags("Books")
@Throttle({ default: { limit: 120, ttl: 60_000 } })
export class BooksController {
  constructor(
    @Inject(BooksService) private readonly booksService: BooksService
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: "Lister les livres publies avec filtres et pagination",
  })
  @ApiPaginatedResponse(BookResponseDto)
  async findAll(
    @Query() filters: FilterBooksDto,
    @CurrentUser() user?: AuthenticatedRequestUser
  ) {
    const result = await this.booksService.findAll(filters, user?.id);

    return ResponseDto.ok(result.data, undefined, result.meta);
  }

  @Get("featured")
  @ApiOperation({ summary: "Recuperer les 6 livres mis en avant" })
  @ApiResponse({
    status: 200,
    description: "Livres featured",
    type: BookResponseDto,
    isArray: true,
  })
  async findFeatured() {
    return ResponseDto.ok(await this.booksService.findFeatured());
  }

  @Get("categories")
  @ApiOperation({ summary: "Lister les categories avec compteurs" })
  @ApiResponse({
    status: 200,
    description: "Categories du catalogue",
    type: CategoryCountResponseDto,
    isArray: true,
  })
  async getCategories() {
    return ResponseDto.ok(await this.booksService.getCategories());
  }

  @Get("search")
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary:
      "Rechercher des livres par titre, auteur, categorie ou description",
  })
  @ApiResponse({
    status: 200,
    description: "Resultats de recherche",
    type: BookResponseDto,
    isArray: true,
  })
  async search(
    @Query("q") query: string,
    @Query() filters: FilterBooksDto,
    @CurrentUser() user?: AuthenticatedRequestUser
  ) {
    return ResponseDto.ok(
      await this.booksService.searchBooks(query ?? "", filters, user?.id)
    );
  }

  @Get(":id")
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: "Recuperer le detail d’un livre et incrementer ses vues",
  })
  @ApiResponse({
    status: 200,
    description: "Detail du livre",
    type: BookResponseDto,
  })
  @ApiResponse({ status: 404, description: "Livre introuvable" })
  async findOne(
    @Param("id") id: string,
    @CurrentUser() user?: AuthenticatedRequestUser
  ) {
    return ResponseDto.ok(await this.booksService.findOne(id, user?.id));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AUTHOR)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Creer un livre admin ou auteur" })
  @ApiResponse({
    status: 201,
    description: "Livre cree",
    type: BookResponseDto,
  })
  async create(
    @Body() dto: CreateBookDto,
    @CurrentUser() user: AuthenticatedRequestUser
  ) {
    return ResponseDto.created(
      await this.booksService.create(dto, user.role),
      "Livre cree avec succes"
    );
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AUTHOR)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Mettre a jour un livre admin ou auteur" })
  @ApiResponse({
    status: 200,
    description: "Livre mis a jour",
    type: BookResponseDto,
  })
  async update(@Param("id") id: string, @Body() dto: UpdateBookDto) {
    return ResponseDto.ok(
      await this.booksService.update(id, dto),
      "Livre mis a jour"
    );
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth("JWT-auth")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Supprimer un livre admin" })
  @ApiResponse({ status: 204, description: "Livre supprime" })
  async delete(@Param("id") id: string) {
    await this.booksService.delete(id);
  }

  @Post(":id/review")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Ajouter un avis sur un livre emprunte ou achete" })
  @ApiResponse({
    status: 201,
    description: "Avis cree",
    type: BookReviewResponseDto,
  })
  async createReview(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: CreateReviewDto
  ) {
    return ResponseDto.created(
      await this.booksService.createReview(id, user.id, dto),
      "Avis publie"
    );
  }

  @Delete(":id/review")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Supprimer son avis sur un livre" })
  @ApiResponse({ status: 204, description: "Avis supprime" })
  async deleteReview(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedRequestUser
  ) {
    await this.booksService.deleteReview(id, user.id);
  }
}
