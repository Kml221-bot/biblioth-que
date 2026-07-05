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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { Roles } from "../../common/decorators";
import { ResponseDto } from "../../common/dto/response.dto";
import { JwtAuthGuard, RolesGuard } from "../../common/guards";
import { AdminService } from "./admin.service";
import {
  AdminAuthorActionResponseDto,
  AdminBookActionResponseDto,
  AdminPenaltyActionResponseDto,
  AdminUserResponseDto,
  AdminUsersQueryDto,
  BroadcastNotificationDto,
  BroadcastNotificationResponseDto,
  OverdueBorrowResponseDto,
  OverviewStatsResponseDto,
  RevenuePointResponseDto,
  RevenueStatsQueryDto,
} from "./dto";

@Controller("admin")
@ApiTags("Administration")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminController {
  constructor(
    @Inject(AdminService) private readonly adminService: AdminService
  ) {}

  @Get("stats/overview")
  @ApiOperation({ summary: "Recuperer les KPIs globaux du dashboard admin" })
  @ApiResponse({
    status: 200,
    description: "KPIs globaux",
    type: OverviewStatsResponseDto,
  })
  async getOverviewStats() {
    return ResponseDto.ok(await this.adminService.getOverviewStats());
  }

  @Get("stats/revenue")
  @ApiOperation({ summary: "Recuperer les revenus par periode et par source" })
  @ApiResponse({
    status: 200,
    description: "Series de revenus",
    type: RevenuePointResponseDto,
    isArray: true,
  })
  async getRevenueStats(@Query() query: RevenueStatsQueryDto) {
    return ResponseDto.ok(await this.adminService.getRevenueStats(query.period));
  }

  @Get("borrows/overdue")
  @ApiOperation({ summary: "Lister les emprunts en retard avec amende calculee" })
  @ApiResponse({
    status: 200,
    description: "Emprunts en retard",
    type: OverdueBorrowResponseDto,
    isArray: true,
  })
  async getOverdueBorrows() {
    return ResponseDto.ok(await this.adminService.getOverdueBorrows());
  }

  @Post("books/:id/approve")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Publier un livre soumis par un auteur" })
  @ApiResponse({
    status: 200,
    description: "Livre publie",
    type: AdminBookActionResponseDto,
  })
  async approveBook(@Param("id") id: string) {
    return ResponseDto.ok(await this.adminService.approveBook(id));
  }

  @Post("books/:id/suspend")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Suspendre un livre du catalogue" })
  @ApiResponse({
    status: 200,
    description: "Livre suspendu",
    type: AdminBookActionResponseDto,
  })
  async suspendBook(@Param("id") id: string) {
    return ResponseDto.ok(await this.adminService.suspendBook(id));
  }

  @Post("penalties/:id/waive")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Annuler une amende utilisateur" })
  @ApiResponse({
    status: 200,
    description: "Amende annulee",
    type: AdminPenaltyActionResponseDto,
  })
  async waivePenalty(@Param("id") id: string) {
    return ResponseDto.ok(await this.adminService.waivePenalty(id));
  }

  @Get("users")
  @ApiOperation({ summary: "Lister les utilisateurs avec filtres admin" })
  @ApiResponse({
    status: 200,
    description: "Utilisateurs pagines",
    type: AdminUserResponseDto,
    isArray: true,
  })
  async findUsers(@Query() query: AdminUsersQueryDto) {
    const result = await this.adminService.findUsers(query);

    return ResponseDto.ok(result.data, undefined, result.meta);
  }

  @Patch("users/:id/suspend")
  @ApiOperation({ summary: "Suspendre un compte utilisateur" })
  @ApiResponse({
    status: 200,
    description: "Utilisateur suspendu",
    type: AdminUserResponseDto,
  })
  async suspendUser(@Param("id") id: string) {
    return ResponseDto.ok(await this.adminService.suspendUser(id));
  }

  @Post("authors/:id/approve")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Valider un profil auteur" })
  @ApiResponse({
    status: 200,
    description: "Auteur valide",
    type: AdminAuthorActionResponseDto,
  })
  async approveAuthor(@Param("id") id: string) {
    return ResponseDto.ok(await this.adminService.approveAuthor(id));
  }

  @Post("notifications/broadcast")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Envoyer une notification broadcast aux users actifs" })
  @ApiResponse({
    status: 200,
    description: "Broadcast cree",
    type: BroadcastNotificationResponseDto,
  })
  async broadcastNotification(@Body() dto: BroadcastNotificationDto) {
    return ResponseDto.ok(
      await this.adminService.broadcastNotification(dto),
      "Broadcast programme avec succes"
    );
  }
}
