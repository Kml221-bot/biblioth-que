import {
  Body,
  Controller,
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
import { PaginationDto } from "../../common/dto/pagination.dto";
import { ResponseDto } from "../../common/dto/response.dto";
import { JwtAuthGuard, RolesGuard } from "../../common/guards";
import { AuthenticatedRequestUser } from "../auth/types/auth.types";
import { BorrowsService } from "./borrows.service";
import {
  BorrowResponseDto,
  CreateBorrowDto,
  RenewalPaymentResponseDto,
  RenewBorrowDto,
  UpdateProgressDto,
} from "./dto";

@Controller("borrows")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
@ApiTags("Borrows")
export class BorrowsController {
  constructor(@Inject(BorrowsService) private readonly borrowsService: BorrowsService) {}

  @Get()
  @ApiOperation({ summary: "Lister mes emprunts actifs avec jours restants" })
  @ApiResponse({
    status: 200,
    description: "Emprunts actifs",
    type: BorrowResponseDto,
    isArray: true,
  })
  async findActive(@CurrentUser() user: AuthenticatedRequestUser) {
    return ResponseDto.ok(await this.borrowsService.findActive(user.id));
  }

  @Get("history")
  @ApiOperation({ summary: "Lister mon historique d’emprunts pagine" })
  @ApiResponse({
    status: 200,
    description: "Historique des emprunts",
    type: BorrowResponseDto,
    isArray: true,
  })
  async findHistory(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query() pagination: PaginationDto
  ) {
    const result = await this.borrowsService.findHistory(user.id, pagination);

    return ResponseDto.ok(result.data, undefined, result.meta);
  }

  @Get("overdue")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: "Lister tous les emprunts en retard admin" })
  @ApiResponse({
    status: 200,
    description: "Emprunts en retard",
    type: BorrowResponseDto,
    isArray: true,
  })
  async findOverdue() {
    return ResponseDto.ok(await this.borrowsService.findOverdue());
  }

  @Post()
  @ApiOperation({
    summary: "Creer un emprunt intelligent avec verification quota",
  })
  @ApiResponse({
    status: 201,
    description: "Emprunt cree",
    type: BorrowResponseDto,
  })
  @Throttle({ default: { limit: 10, ttl: 3_600_000 } })
  async create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: CreateBorrowDto
  ) {
    return ResponseDto.created(
      await this.borrowsService.createBorrow(user.id, dto),
      "Emprunt confirme"
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Recuperer le detail d’un emprunt" })
  @ApiResponse({
    status: 200,
    description: "Detail emprunt",
    type: BorrowResponseDto,
  })
  async findOne(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedRequestUser
  ) {
    return ResponseDto.ok(await this.borrowsService.findOne(id, user.id));
  }

  @Post(":id/renew")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Demander un renouvellement payant Wave" })
  @ApiResponse({
    status: 200,
    description: "Transaction de renouvellement en attente",
    type: RenewalPaymentResponseDto,
  })
  async renew(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: RenewBorrowDto
  ) {
    return ResponseDto.ok(
      await this.borrowsService.renewBorrow(id, user.id, dto),
      "Paiement de renouvellement requis"
    );
  }

  @Post(":id/return")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Retourner un livre et creer une amende si retard" })
  @ApiResponse({
    status: 200,
    description: "Retour confirme",
    type: BorrowResponseDto,
  })
  async returnBorrow(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedRequestUser
  ) {
    return ResponseDto.ok(
      await this.borrowsService.returnBorrow(id, user.id),
      "Retour confirme"
    );
  }

  @Patch(":id/progress")
  @ApiOperation({
    summary: "Mettre a jour le marque-page et la progression de lecture",
  })
  @ApiResponse({
    status: 200,
    description: "Progression mise a jour",
    type: BorrowResponseDto,
  })
  async updateProgress(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: UpdateProgressDto
  ) {
    return ResponseDto.ok(
      await this.borrowsService.updateProgress(id, user.id, dto),
      "Progression mise a jour"
    );
  }
}
