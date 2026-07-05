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
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser, Roles } from "../../common/decorators";
import { ResponseDto } from "../../common/dto/response.dto";
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
  RolesGuard,
} from "../../common/guards";
import { AuthenticatedRequestUser } from "../auth/types/auth.types";
import { ChaptersService } from "./chapters.service";
import {
  ChapterResponseDto,
  CreateChapterDto,
  UpdateChapterDto,
} from "./dto";

@Controller()
@ApiTags("Chapters")
export class ChaptersController {
  constructor(
    @Inject(ChaptersService)
    private readonly chaptersService: ChaptersService
  ) {}

  // ── Lister les chapitres d'un livre ──────────────────────────
  @Get("books/:bookId/chapters")
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: "Lister les chapitres d'un livre avec statut d'accès" })
  @ApiParam({ name: "bookId", type: String })
  @ApiResponse({ status: 200, type: ChapterResponseDto, isArray: true })
  async findAll(
    @Param("bookId") bookId: string,
    @CurrentUser() user?: AuthenticatedRequestUser
  ) {
    return ResponseDto.ok(
      await this.chaptersService.findAllByBook(bookId, user?.id, user?.role)
    );
  }

  // ── Détail d'un chapitre ──────────────────────────────────────
  @Get("chapters/:id")
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: "Récupérer un chapitre (contenu masqué si non accessible)" })
  @ApiResponse({ status: 200, type: ChapterResponseDto })
  async findOne(
    @Param("id") id: string,
    @CurrentUser() user?: AuthenticatedRequestUser
  ) {
    return ResponseDto.ok(
      await this.chaptersService.findOne(id, user?.id, user?.role)
    );
  }

  // ── Débloquer avec des BiblioCoins ────────────────────────────
  @Post("chapters/:id/unlock")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Débloquer un chapitre payant avec ses BiblioCoins" })
  @ApiResponse({ status: 200, description: "Chapitre débloqué", type: ChapterResponseDto })
  @ApiResponse({ status: 403, description: "Solde insuffisant ou déjà débloqué" })
  async unlock(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedRequestUser
  ) {
    return ResponseDto.ok(
      await this.chaptersService.unlock(id, user.id),
      "Chapitre débloqué avec succès"
    );
  }

  // ── CRUD admin ────────────────────────────────────────────────
  @Post("books/:bookId/chapters")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.AUTHOR)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Créer un chapitre (admin/auteur)" })
  @ApiResponse({ status: 201, type: ChapterResponseDto })
  async create(
    @Param("bookId") bookId: string,
    @Body() dto: CreateChapterDto
  ) {
    return ResponseDto.created(
      await this.chaptersService.create(bookId, dto),
      "Chapitre créé"
    );
  }

  @Patch("chapters/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.AUTHOR)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Modifier un chapitre (admin/auteur)" })
  @ApiResponse({ status: 200, type: ChapterResponseDto })
  async update(@Param("id") id: string, @Body() dto: UpdateChapterDto) {
    return ResponseDto.ok(
      await this.chaptersService.update(id, dto),
      "Chapitre mis à jour"
    );
  }

  @Delete("chapters/:id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth("JWT-auth")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Supprimer un chapitre (admin)" })
  async delete(@Param("id") id: string) {
    await this.chaptersService.delete(id);
  }
}
