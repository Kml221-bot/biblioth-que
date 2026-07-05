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
import { CurrentUser } from "../../common/decorators";
import { JwtAuthGuard } from "../../common/guards";
import { PaginationDto } from "../../common/dto/pagination.dto";
import { ResponseDto } from "../../common/dto/response.dto";
import { AuthenticatedRequestUser } from "../auth/types/auth.types";
import {
  CreateListingDto,
  ListingResponseDto,
  MarketplaceMessageResponseDto,
  SendMessageDto,
  UpdateListingDto,
} from "./dto";
import { MarketplaceService } from "./marketplace.service";

@Controller("marketplace")
@UseGuards(JwtAuthGuard)
@ApiTags("Marketplace")
@ApiBearerAuth("JWT-auth")
export class MarketplaceController {
  constructor(
    @Inject(MarketplaceService)
    private readonly marketplaceService: MarketplaceService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Lister les annonces actives du marketplace" })
  @ApiQuery({ name: "search", type: String, required: false })
  @ApiResponse({
    status: 200,
    description: "Liste paginee des annonces",
    type: [ListingResponseDto],
  })
  async findAll(
    @Query() pagination: PaginationDto,
    @Query("search") search?: string,
  ) {
    const result = await this.marketplaceService.findAll(pagination, search);
    return ResponseDto.ok(result.data, undefined, result.meta);
  }

  @Get("mine")
  @ApiOperation({ summary: "Mes annonces" })
  @ApiResponse({
    status: 200,
    description: "Liste de mes annonces",
    type: [ListingResponseDto],
  })
  async findMine(@CurrentUser() user: AuthenticatedRequestUser) {
    return ResponseDto.ok(await this.marketplaceService.findMine(user.id));
  }

  @Get(":id")
  @ApiOperation({ summary: "Detail d'une annonce" })
  @ApiResponse({
    status: 200,
    description: "Detail de l'annonce",
    type: ListingResponseDto,
  })
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return ResponseDto.ok(await this.marketplaceService.findOne(id));
  }

  @Post()
  @ApiOperation({ summary: "Creer une annonce de revente" })
  @ApiResponse({
    status: 201,
    description: "Annonce creee",
    type: ListingResponseDto,
  })
  async create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: CreateListingDto,
  ) {
    return ResponseDto.created(
      await this.marketplaceService.create(user.id, dto),
      "Annonce creee avec succes",
    );
  }

  @Patch(":id")
  @ApiOperation({ summary: "Modifier une annonce (proprietaire)" })
  @ApiResponse({
    status: 200,
    description: "Annonce mise a jour",
    type: ListingResponseDto,
  })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: UpdateListingDto,
  ) {
    return ResponseDto.ok(
      await this.marketplaceService.update(id, user.id, dto),
      "Annonce mise a jour",
    );
  }

  @Post(":id/archive")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Archiver une annonce (proprietaire)" })
  @ApiResponse({
    status: 200,
    description: "Annonce archivee",
    type: ListingResponseDto,
  })
  async archive(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return ResponseDto.ok(
      await this.marketplaceService.archive(id, user.id),
      "Annonce archivee",
    );
  }

  @Get(":id/messages")
  @ApiOperation({ summary: "Messages d'une annonce" })
  @ApiResponse({
    status: 200,
    description: "Liste des messages",
    type: [MarketplaceMessageResponseDto],
  })
  async getMessages(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query() pagination: PaginationDto,
  ) {
    return ResponseDto.ok(
      await this.marketplaceService.getMessages(id, user.id, pagination),
    );
  }

  @Post(":id/messages")
  @ApiOperation({ summary: "Envoyer un message sur une annonce" })
  @ApiResponse({
    status: 201,
    description: "Message envoye",
    type: MarketplaceMessageResponseDto,
  })
  async sendMessage(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: SendMessageDto,
  ) {
    return ResponseDto.created(
      await this.marketplaceService.sendMessage(id, user.id, dto),
      "Message envoye",
    );
  }
}
