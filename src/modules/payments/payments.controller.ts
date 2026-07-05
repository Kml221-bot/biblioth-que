import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
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
import { CurrentUser, Public } from "../../common/decorators";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { ResponseDto } from "../../common/dto/response.dto";
import { JwtAuthGuard } from "../../common/guards";
import { AuthenticatedRequestUser } from "../auth/types/auth.types";
import {
  InitiatePaymentDto,
  PaymentInitiationResponseDto,
  TransactionResponseDto,
  WebhookDto,
} from "./dto";
import { PaymentsService } from "./payments.service";

@Controller("payments")
@ApiTags("Payments")
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly paymentsService: PaymentsService) {}

  @Post("initiate")
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @ApiBearerAuth("JWT-auth")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Initier un paiement Wave via Naboopay" })
  @ApiResponse({
    status: 200,
    description: "URL de paiement generee",
    type: PaymentInitiationResponseDto,
  })
  async initiate(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: InitiatePaymentDto
  ) {
    return ResponseDto.ok(
      await this.paymentsService.initiatePayment(user.id, dto),
      "Paiement Wave initialise"
    );
  }

  @Public()
  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Recevoir les webhooks Naboopay" })
  @ApiResponse({ status: 200, description: "Webhook traite" })
  async webhook(
    @Body() dto: WebhookDto,
    @Headers("x-naboopay-signature") signature?: string,
    @Headers("x-signature") fallbackSignature?: string
  ) {
    return ResponseDto.ok(
      await this.paymentsService.handleWebhook(
        dto,
        signature ?? fallbackSignature
      )
    );
  }

  @Get("history")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Lister mon historique de transactions" })
  @ApiResponse({
    status: 200,
    description: "Historique paiements",
    type: TransactionResponseDto,
    isArray: true,
  })
  async history(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query() pagination: PaginationDto
  ) {
    const result = await this.paymentsService.getHistory(user.id, pagination);

    return ResponseDto.ok(result.data, undefined, result.meta);
  }

  @Post("penalty/:id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Payer une amende via Wave" })
  @ApiResponse({
    status: 200,
    description: "URL paiement amende",
    type: PaymentInitiationResponseDto,
  })
  async penalty(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param("id") id: string
  ) {
    return ResponseDto.ok(
      await this.paymentsService.initiatePenaltyPayment(user.id, id)
    );
  }

  @Post("subscribe")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Initier un abonnement illimite 2000 FCFA/mois" })
  @ApiResponse({
    status: 200,
    description: "URL paiement abonnement",
    type: PaymentInitiationResponseDto,
  })
  async subscribe(@CurrentUser() user: AuthenticatedRequestUser) {
    return ResponseDto.ok(
      await this.paymentsService.initiateSubscription(user.id)
    );
  }

  @Post("wallet/recharge")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Initier une recharge wallet Wave" })
  @ApiResponse({
    status: 200,
    description: "URL recharge wallet",
    type: PaymentInitiationResponseDto,
  })
  async walletRecharge(@CurrentUser() user: AuthenticatedRequestUser) {
    return ResponseDto.ok(
      await this.paymentsService.initiateWalletRecharge(user.id)
    );
  }
}
