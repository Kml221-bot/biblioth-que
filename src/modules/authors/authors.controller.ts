import {
  Body,
  Controller,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { AuthorStatus, UserRole } from "@prisma/client";
import { CurrentUser, Roles } from "../../common/decorators";
import { JwtAuthGuard, RolesGuard } from "../../common/guards";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { ResponseDto } from "../../common/dto/response.dto";
import {
  AuthorProfileResponseDto,
  CreateAuthorProfileDto,
  UpdateAuthorProfileDto,
} from "./dto";
import { AuthorsService } from "./authors.service";
import { AuthenticatedRequestUser } from "../auth/types/auth.types";

@Controller("authors")
@UseGuards(JwtAuthGuard)
@ApiTags("Authors")
@ApiBearerAuth("JWT-auth")
export class AuthorsController {
  constructor(
    @Inject(AuthorsService) private readonly authorsService: AuthorsService,
  ) {}

  @Get("me")
  @ApiOperation({ summary: "Recuperer mon profil auteur" })
  @ApiResponse({
    status: 200,
    description: "Profil auteur ou null",
    type: AuthorProfileResponseDto,
  })
  async getMyProfile(@CurrentUser() user: AuthenticatedRequestUser) {
    return ResponseDto.ok(await this.authorsService.getMyProfile(user.id));
  }

  @Post()
  @ApiOperation({ summary: "Creer une demande de profil auteur" })
  @ApiResponse({
    status: 201,
    description: "Demande de profil auteur creee (statut PENDING)",
    type: AuthorProfileResponseDto,
  })
  @ApiResponse({ status: 409, description: "Profil auteur existant" })
  async createProfile(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: CreateAuthorProfileDto,
  ) {
    return ResponseDto.created(
      await this.authorsService.createProfile(user.id, dto),
      "Demande de profil auteur soumise",
    );
  }

  @Patch("me")
  @ApiOperation({ summary: "Mettre a jour mon profil auteur" })
  @ApiResponse({
    status: 200,
    description: "Profil auteur mis a jour",
    type: AuthorProfileResponseDto,
  })
  async updateProfile(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: UpdateAuthorProfileDto,
  ) {
    return ResponseDto.ok(
      await this.authorsService.updateProfile(user.id, dto),
      "Profil auteur mis a jour",
    );
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Lister les auteurs (admin)" })
  @ApiQuery({ name: "status", enum: AuthorStatus, required: false })
  @ApiResponse({
    status: 200,
    description: "Liste paginee des auteurs",
    type: [AuthorProfileResponseDto],
  })
  async findAll(
    @Query() pagination: PaginationDto,
    @Query("status") status?: AuthorStatus,
  ) {
    const result = await this.authorsService.findAll(pagination, status);
    return ResponseDto.ok(result.data, undefined, result.meta);
  }

  @Post(":id/approve")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Approuver un auteur (admin)" })
  @ApiResponse({
    status: 200,
    description: "Auteur approuve",
    type: AuthorProfileResponseDto,
  })
  async approve(@Param("id", ParseUUIDPipe) id: string) {
    return ResponseDto.ok(
      await this.authorsService.approve(id),
      "Auteur approuve",
    );
  }

  @Post(":id/reject")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Rejeter un auteur (admin)" })
  @ApiResponse({
    status: 200,
    description: "Auteur rejete",
    type: AuthorProfileResponseDto,
  })
  async reject(@Param("id", ParseUUIDPipe) id: string) {
    return ResponseDto.ok(
      await this.authorsService.reject(id),
      "Auteur rejete",
    );
  }
}
