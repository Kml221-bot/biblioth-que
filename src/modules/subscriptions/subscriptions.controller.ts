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
import { CurrentUser } from "../../common/decorators";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { ResponseDto } from "../../common/dto/response.dto";
import { JwtAuthGuard } from "../../common/guards";
import { AuthenticatedRequestUser } from "../auth/types/auth.types";
import { CreateSubscriptionDto, SubscriptionResponseDto } from "./dto";
import { SubscriptionsService } from "./subscriptions.service";
import { PaymentsService } from "../payments/payments.service";

@Controller("subscriptions")
@UseGuards(JwtAuthGuard)
@ApiTags("Subscriptions")
@ApiBearerAuth("JWT-auth")
export class SubscriptionsController {
  constructor(
    @Inject(SubscriptionsService)
    private readonly subscriptionsService: SubscriptionsService,
    @Inject(PaymentsService)
    private readonly paymentsService: PaymentsService,
  ) {}

  @Get("current")
  @ApiOperation({ summary: "Recuperer l'abonnement actif de l'utilisateur" })
  @ApiResponse({
    status: 200,
    description: "Abonnement actif ou null",
    type: SubscriptionResponseDto,
  })
  async getCurrent(@CurrentUser() user: AuthenticatedRequestUser) {
    const data = await this.subscriptionsService.getCurrentSubscription(
      user.id,
    );

    return ResponseDto.ok(data, "Abonnement actif");
  }

  @Get("history")
  @ApiOperation({
    summary: "Historique pagine des abonnements de l'utilisateur",
  })
  @ApiResponse({
    status: 200,
    description: "Liste paginee des abonnements",
    type: SubscriptionResponseDto,
    isArray: true,
  })
  async getHistory(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query() pagination: PaginationDto,
  ) {
    const result = await this.subscriptionsService.getHistory(
      user.id,
      pagination,
    );

    return ResponseDto.ok(result.data, undefined, result.meta);
  }

  @Post()
  @ApiOperation({ summary: "Souscrire a un nouveau plan" })
  @ApiResponse({
    status: 201,
    description: "Abonnement cree",
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 409, description: "Abonnement actif existant" })
  async subscribe(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: CreateSubscriptionDto,
  ) {
    return ResponseDto.created(
      await this.subscriptionsService.subscribe(user.id, dto),
      "Abonnement cree avec succes",
    );
  }

  /**
   * Route utilisée par le frontend Abonnements.tsx
   * Initie un paiement Naboopay et retourne une paymentUrl
   */
  @Post("subscribe")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Initier le paiement d'un abonnement via Naboopay" })
  @ApiResponse({
    status: 200,
    description: "URL de paiement Naboopay générée",
  })
  async initiateSubscribePayment(
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    const result = await this.paymentsService.initiateSubscription(user.id);
    return ResponseDto.ok(
      result,
      "Paiement abonnement initié",
    );
  }

  @Post(":id/cancel")
  @ApiOperation({ summary: "Annuler un abonnement" })
  @ApiResponse({
    status: 200,
    description: "Abonnement annule",
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 404, description: "Abonnement introuvable" })
  @ApiResponse({
    status: 403,
    description: "Pas le proprietaire de l'abonnement",
  })
  async cancel(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return ResponseDto.ok(
      await this.subscriptionsService.cancel(id, user.id),
      "Abonnement annule",
    );
  }

  @Patch(":id/auto-renew")
  @ApiOperation({
    summary: "Activer ou desactiver le renouvellement automatique",
  })
  @ApiResponse({
    status: 200,
    description: "Renouvellement automatique mis a jour",
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 404, description: "Abonnement introuvable" })
  @ApiResponse({
    status: 403,
    description: "Pas le proprietaire de l'abonnement",
  })
  async toggleAutoRenew(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return ResponseDto.ok(
      await this.subscriptionsService.toggleAutoRenew(id, user.id),
      "Renouvellement automatique mis a jour",
    );
  }
}
