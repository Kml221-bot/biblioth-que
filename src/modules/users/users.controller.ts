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
import { UserRole, UserStatus } from "@prisma/client";
import { Roles } from "../../common/decorators";
import { JwtAuthGuard, RolesGuard } from "../../common/guards";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { ResponseDto } from "../../common/dto/response.dto";
import { UpdateUserDto, UserDetailDto, UserListItemDto } from "./dto";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiTags("Users")
@ApiBearerAuth("JWT-auth")
export class UsersController {
  constructor(
    @Inject(UsersService) private readonly usersService: UsersService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Lister les utilisateurs (admin)" })
  @ApiQuery({ name: "role", enum: UserRole, required: false })
  @ApiQuery({ name: "status", enum: UserStatus, required: false })
  @ApiQuery({ name: "search", type: String, required: false })
  @ApiResponse({
    status: 200,
    description: "Liste paginee des utilisateurs",
    type: [UserListItemDto],
  })
  async findAll(
    @Query() pagination: PaginationDto,
    @Query("role") role?: UserRole,
    @Query("status") status?: UserStatus,
    @Query("search") search?: string,
  ) {
    const result = await this.usersService.findAll(
      pagination,
      role,
      status,
      search,
    );
    return ResponseDto.ok(result.data, undefined, result.meta);
  }

  @Get(":id")
  @ApiOperation({ summary: "Detail d'un utilisateur (admin)" })
  @ApiResponse({
    status: 200,
    description: "Detail utilisateur avec stats et abonnement",
    type: UserDetailDto,
  })
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return ResponseDto.ok(await this.usersService.findOne(id));
  }

  @Patch(":id")
  @ApiOperation({ summary: "Modifier un utilisateur (admin)" })
  @ApiResponse({
    status: 200,
    description: "Utilisateur mis a jour",
    type: UserDetailDto,
  })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return ResponseDto.ok(
      await this.usersService.update(id, dto),
      "Utilisateur mis a jour",
    );
  }

  @Post(":id/suspend")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Suspendre un utilisateur (admin)" })
  @ApiResponse({ status: 200, description: "Utilisateur suspendu" })
  async suspend(@Param("id", ParseUUIDPipe) id: string) {
    return ResponseDto.ok(
      await this.usersService.suspend(id),
      "Utilisateur suspendu",
    );
  }

  @Post(":id/reactivate")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reactiver un utilisateur suspendu (admin)" })
  @ApiResponse({ status: 200, description: "Utilisateur reactive" })
  async reactivate(@Param("id", ParseUUIDPipe) id: string) {
    return ResponseDto.ok(
      await this.usersService.reactivate(id),
      "Utilisateur reactive",
    );
  }
}
