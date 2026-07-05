import {
  Controller,
  Get,
  Inject,
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
import { ResponseDto } from "../../common/dto/response.dto";
import { AuthenticatedRequestUser } from "../auth/types/auth.types";
import { GamificationService } from "./gamification.service";

@Controller("badges")
@UseGuards(JwtAuthGuard)
@ApiTags("Gamification")
@ApiBearerAuth("JWT-auth")
export class GamificationController {
  constructor(
    @Inject(GamificationService)
    private readonly gamificationService: GamificationService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Recuperer mes badges" })
  @ApiResponse({ status: 200, description: "Liste des badges obtenus" })
  async getMyBadges(@CurrentUser() user: AuthenticatedRequestUser) {
    return ResponseDto.ok(
      await this.gamificationService.getUserBadges(user.id),
    );
  }
}
