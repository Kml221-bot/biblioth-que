import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { CurrentUser, Roles } from "../../common/decorators";
import { ResponseDto } from "../../common/dto/response.dto";
import { JwtAuthGuard, RolesGuard } from "../../common/guards";
import { AuthenticatedRequestUser } from "../auth/types/auth.types";
import { CoinsService } from "./coins.service";
import {
  CoinBalanceResponseDto,
  CoinPackDto,
  CoinTransactionResponseDto,
  CreditCoinsDto,
} from "./dto";

@Controller("coins")
@ApiTags("Coins")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
export class CoinsController {
  constructor(@Inject(CoinsService) private readonly coinsService: CoinsService) {}

  @Get("balance")
  @ApiOperation({ summary: "Consulter son solde de BiblioCoins" })
  @ApiResponse({ status: 200, type: CoinBalanceResponseDto })
  async getBalance(@CurrentUser() user: AuthenticatedRequestUser) {
    return ResponseDto.ok(await this.coinsService.getBalance(user.id));
  }

  @Get("transactions")
  @ApiOperation({ summary: "Historique des transactions de BiblioCoins" })
  @ApiResponse({ status: 200, type: CoinTransactionResponseDto, isArray: true })
  async getTransactions(@CurrentUser() user: AuthenticatedRequestUser) {
    return ResponseDto.ok(await this.coinsService.getTransactions(user.id));
  }

  @Get("packs")
  @ApiOperation({ summary: "Lister les packs de BiblioCoins disponibles" })
  @ApiResponse({ status: 200, type: CoinPackDto, isArray: true })
  async getPacks() {
    return ResponseDto.ok(this.coinsService.getPacks());
  }

  @Post("purchase/:packId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Acheter un pack de BiblioCoins (stub — intégrer CinetPay en prod)" })
  @ApiResponse({ status: 200, type: CoinBalanceResponseDto })
  async purchase(
    @Param("packId") packId: string,
    @CurrentUser() user: AuthenticatedRequestUser
  ) {
    return ResponseDto.ok(
      await this.coinsService.purchase(user.id, packId),
      "BiblioCoins crédités"
    );
  }

  @Post("credit")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: "Créditer manuellement un utilisateur (admin)" })
  @ApiResponse({ status: 201, type: CoinBalanceResponseDto })
  async creditUser(@Body() dto: CreditCoinsDto) {
    return ResponseDto.created(
      await this.coinsService.creditUser(dto),
      "BiblioCoins crédités"
    );
  }
}
