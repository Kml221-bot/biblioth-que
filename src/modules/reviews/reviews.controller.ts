import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators";
import { JwtAuthGuard } from "../../common/guards";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { ResponseDto } from "../../common/dto/response.dto";
import { AuthenticatedRequestUser } from "../auth/types/auth.types";
import {
  BookRatingDto,
  CreateReviewDto,
  ReviewResponseDto,
  UpdateReviewDto,
} from "./dto";
import { ReviewsService } from "./reviews.service";

@Controller("books/:bookId/reviews")
@ApiTags("Reviews")
export class ReviewsController {
  constructor(
    @Inject(ReviewsService) private readonly reviewsService: ReviewsService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Lister les avis d'un livre" })
  @ApiResponse({
    status: 200,
    description: "Liste paginee des avis",
    type: [ReviewResponseDto],
  })
  async findByBook(
    @Param("bookId", ParseUUIDPipe) bookId: string,
    @Query() pagination: PaginationDto,
  ) {
    const result = await this.reviewsService.findByBook(bookId, pagination);
    return ResponseDto.ok(result.data, undefined, result.meta);
  }

  @Get("rating")
  @ApiOperation({ summary: "Note moyenne et distribution d'un livre" })
  @ApiResponse({
    status: 200,
    description: "Statistiques de notation",
    type: BookRatingDto,
  })
  async getRating(@Param("bookId", ParseUUIDPipe) bookId: string) {
    return ResponseDto.ok(await this.reviewsService.getBookRating(bookId));
  }

  @Get("mine")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Mon avis sur ce livre" })
  @ApiResponse({
    status: 200,
    description: "Mon avis ou null",
    type: ReviewResponseDto,
  })
  async getMyReview(
    @Param("bookId", ParseUUIDPipe) bookId: string,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return ResponseDto.ok(
      await this.reviewsService.getMyReview(user.id, bookId),
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Laisser un avis (1 par livre)" })
  @ApiResponse({
    status: 201,
    description: "Avis cree",
    type: ReviewResponseDto,
  })
  @ApiResponse({ status: 409, description: "Avis existant" })
  async create(
    @Param("bookId", ParseUUIDPipe) bookId: string,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: CreateReviewDto,
  ) {
    return ResponseDto.created(
      await this.reviewsService.create(user.id, bookId, dto),
      "Avis publie",
    );
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Modifier mon avis" })
  @ApiResponse({
    status: 200,
    description: "Avis mis a jour",
    type: ReviewResponseDto,
  })
  async update(
    @Param("bookId", ParseUUIDPipe) bookId: string,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: UpdateReviewDto,
  ) {
    return ResponseDto.ok(
      await this.reviewsService.update(user.id, bookId, dto),
      "Avis mis a jour",
    );
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Supprimer mon avis" })
  @ApiResponse({ status: 204, description: "Avis supprime" })
  async delete(
    @Param("bookId", ParseUUIDPipe) bookId: string,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    await this.reviewsService.delete(user.id, bookId);
  }
}
