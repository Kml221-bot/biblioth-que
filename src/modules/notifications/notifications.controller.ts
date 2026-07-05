import { Body, Controller, Get, Inject, Param, Patch, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { ResponseDto } from "../../common/dto/response.dto";
import { JwtAuthGuard } from "../../common/guards";
import { AuthenticatedRequestUser } from "../auth/types/auth.types";
import {
  NotificationPreferencesResponseDto,
  NotificationResponseDto,
  UpdateNotificationPreferencesDto,
} from "./dto";
import { NotificationsService } from "./notifications.service";

@Controller("notifications")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
@ApiTags("Notifications")
export class NotificationsController {
  constructor(
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService
  ) {}

  @Get()
  @ApiOperation({ summary: "Lister mes notifications non lues (paginées)" })
  @ApiResponse({
    status: 200,
    description: "Notifications non lues paginées",
    type: NotificationResponseDto,
    isArray: true,
  })
  async getUnread(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query() pagination: PaginationDto,
  ) {
    const result = await this.notificationsService.getUnread(user.id, pagination);
    return ResponseDto.ok(result.data, undefined, result.meta);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Marquer une notification comme lue" })
  @ApiResponse({ status: 200, description: "Notification lue" })
  async markAsRead(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param("id") id: string
  ) {
    return ResponseDto.ok(
      await this.notificationsService.markAsRead(id, user.id)
    );
  }

  @Patch("read-all")
  @ApiOperation({ summary: "Marquer toutes mes notifications comme lues" })
  @ApiResponse({ status: 200, description: "Notifications lues" })
  async markAllAsRead(@CurrentUser() user: AuthenticatedRequestUser) {
    return ResponseDto.ok(
      await this.notificationsService.markAllAsRead(user.id)
    );
  }

  @Get("preferences")
  @ApiOperation({ summary: "Recuperer mes preferences de notification" })
  @ApiResponse({
    status: 200,
    description: "Preferences notifications",
    type: NotificationPreferencesResponseDto,
  })
  async getPreferences(@CurrentUser() user: AuthenticatedRequestUser) {
    return ResponseDto.ok(
      await this.notificationsService.getPreferences(user.id)
    );
  }

  @Patch("preferences")
  @ApiOperation({ summary: "Mettre a jour mes preferences de notification" })
  @ApiResponse({
    status: 200,
    description: "Preferences mises a jour",
    type: NotificationPreferencesResponseDto,
  })
  async updatePreferences(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: UpdateNotificationPreferencesDto
  ) {
    return ResponseDto.ok(
      await this.notificationsService.updatePreferences(user.id, dto)
    );
  }
}
