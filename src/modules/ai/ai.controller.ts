import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
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
import { AiService } from "./ai.service";
import {
  AiChatResponseDto,
  AiQuizResponseDto,
  AiRecommendationDto,
  AiSummaryResponseDto,
  ChatMessageDto,
  ExtractBookTextResponseDto,
  IndexBookTextDto,
  IndexBookTextResponseDto,
} from "./dto";

@Controller("ai")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
@ApiTags("BibliAI")
export class AiController {
  constructor(@Inject(AiService) private readonly aiService: AiService) {}

  @Post("chat")
  @Throttle({ default: { limit: 30, ttl: 3_600_000 } })
  @ApiOperation({
    summary: "Discuter avec BibliAI, avec contexte livre optionnel",
  })
  @ApiResponse({
    status: 200,
    description: "Reponse BibliAI",
    type: AiChatResponseDto,
  })
  async chat(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: ChatMessageDto
  ) {
    return ResponseDto.ok(await this.aiService.chat(user.id, dto));
  }

  @Get("summary/:bookId")
  @ApiOperation({ summary: "Generer le resume IA d’un livre" })
  @ApiResponse({
    status: 200,
    description: "Resume du livre",
    type: AiSummaryResponseDto,
  })
  async summary(@Param("bookId") bookId: string) {
    return ResponseDto.ok(await this.aiService.generateSummary(bookId));
  }

  @Post("quiz/:bookId")
  @ApiOperation({ summary: "Generer un quiz QCM sur un livre" })
  @ApiResponse({
    status: 200,
    description: "Quiz genere",
    type: AiQuizResponseDto,
  })
  async quiz(@Param("bookId") bookId: string) {
    return ResponseDto.ok(await this.aiService.generateQuiz(bookId));
  }

  @Get("recommendations")
  @ApiOperation({ summary: "Recevoir des recommandations personnalisees" })
  @ApiResponse({
    status: 200,
    description: "Recommandations",
    type: AiRecommendationDto,
    isArray: true,
  })
  async recommendations(@CurrentUser() user: AuthenticatedRequestUser) {
    return ResponseDto.ok(await this.aiService.getRecommendations(user.id));
  }

  @Post("index/:bookId")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AUTHOR)
  @ApiOperation({ summary: "Indexer le texte page par page d'un livre" })
  @ApiResponse({
    status: 201,
    description: "Pages indexees",
    type: IndexBookTextResponseDto,
  })
  async indexBookText(
    @Param("bookId") bookId: string,
    @Body() dto: IndexBookTextDto
  ) {
    return ResponseDto.created(
      await this.aiService.indexBookText(bookId, dto),
      "Texte du livre indexe"
    );
  }

  @Post("extract/:bookId")
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.AUTHOR)
  @ApiOperation({
    summary: "Extraire automatiquement le texte du fichier d'un livre",
  })
  @ApiResponse({
    status: 201,
    description: "Texte extrait et indexe",
    type: ExtractBookTextResponseDto,
  })
  async extractBookText(@Param("bookId") bookId: string) {
    return ResponseDto.created(
      await this.aiService.extractAndIndexBookText(bookId),
      "Texte extrait et indexe"
    );
  }
}
