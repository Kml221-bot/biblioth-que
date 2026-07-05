import {
  Body,
  Controller,
  Delete,
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
  CommunityMemberResponseDto,
  CommunityResponseDto,
  CreateCommunityDto,
  CreatePostDto,
  PostResponseDto,
  UpdateCommunityDto,
} from "./dto";
import { CommunitiesService } from "./communities.service";

@Controller("communities")
@UseGuards(JwtAuthGuard)
@ApiTags("Communities")
@ApiBearerAuth("JWT-auth")
export class CommunitiesController {
  constructor(
    @Inject(CommunitiesService)
    private readonly communitiesService: CommunitiesService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Lister les communautes publiques" })
  @ApiQuery({ name: "search", type: String, required: false })
  @ApiResponse({
    status: 200,
    description: "Liste paginee des communautes",
    type: [CommunityResponseDto],
  })
  async findAll(
    @Query() pagination: PaginationDto,
    @Query("search") search?: string,
  ) {
    const result = await this.communitiesService.findAll(pagination, search);
    return ResponseDto.ok(result.data, undefined, result.meta);
  }

  @Get("mine")
  @ApiOperation({ summary: "Mes communautes" })
  @ApiResponse({
    status: 200,
    description: "Communautes dont je suis membre",
    type: [CommunityResponseDto],
  })
  async findMine(@CurrentUser() user: AuthenticatedRequestUser) {
    return ResponseDto.ok(await this.communitiesService.findMine(user.id));
  }

  @Get(":id")
  @ApiOperation({ summary: "Detail d'une communaute" })
  @ApiResponse({
    status: 200,
    description: "Detail de la communaute",
    type: CommunityResponseDto,
  })
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return ResponseDto.ok(await this.communitiesService.findOne(id));
  }

  @Post()
  @ApiOperation({ summary: "Creer une communaute" })
  @ApiResponse({
    status: 201,
    description: "Communaute creee",
    type: CommunityResponseDto,
  })
  async create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: CreateCommunityDto,
  ) {
    return ResponseDto.created(
      await this.communitiesService.create(user.id, dto),
      "Communaute creee avec succes",
    );
  }

  @Patch(":id")
  @ApiOperation({ summary: "Modifier une communaute (proprietaire)" })
  @ApiResponse({
    status: 200,
    description: "Communaute mise a jour",
    type: CommunityResponseDto,
  })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: UpdateCommunityDto,
  ) {
    return ResponseDto.ok(
      await this.communitiesService.update(id, user.id, dto),
      "Communaute mise a jour",
    );
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Supprimer une communaute (proprietaire)" })
  @ApiResponse({ status: 204, description: "Communaute supprimee" })
  async delete(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    await this.communitiesService.delete(id, user.id);
  }

  @Post(":id/join")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Rejoindre une communaute publique" })
  @ApiResponse({
    status: 200,
    description: "Membre ajoute",
    type: CommunityMemberResponseDto,
  })
  async join(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return ResponseDto.ok(
      await this.communitiesService.join(id, user.id),
      "Vous avez rejoint la communaute",
    );
  }

  @Post(":id/leave")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Quitter une communaute" })
  @ApiResponse({ status: 200, description: "Membre retire" })
  async leave(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    return ResponseDto.ok(
      await this.communitiesService.leave(id, user.id),
      "Vous avez quitte la communaute",
    );
  }

  @Get(":id/members")
  @ApiOperation({ summary: "Lister les membres d'une communaute" })
  @ApiResponse({
    status: 200,
    description: "Liste des membres",
    type: [CommunityMemberResponseDto],
  })
  async findMembers(@Param("id", ParseUUIDPipe) id: string) {
    return ResponseDto.ok(await this.communitiesService.findMembers(id));
  }

  @Get(":id/posts")
  @ApiOperation({ summary: "Posts d'une communaute (membres)" })
  @ApiResponse({
    status: 200,
    description: "Liste paginee des posts",
    type: [PostResponseDto],
  })
  async findPosts(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query() pagination: PaginationDto,
  ) {
    const result = await this.communitiesService.findPosts(
      id,
      user.id,
      pagination,
    );
    return ResponseDto.ok(result.data, undefined, result.meta);
  }

  @Post(":id/posts")
  @ApiOperation({ summary: "Publier un post dans une communaute (membres)" })
  @ApiResponse({
    status: 201,
    description: "Post publie",
    type: PostResponseDto,
  })
  async createPost(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: CreatePostDto,
  ) {
    return ResponseDto.created(
      await this.communitiesService.createPost(id, user.id, dto),
      "Post publie",
    );
  }

  @Delete("posts/:postId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Supprimer un post (auteur ou admin)" })
  @ApiResponse({ status: 204, description: "Post supprime" })
  async deletePost(
    @Param("postId", ParseUUIDPipe) postId: string,
    @CurrentUser() user: AuthenticatedRequestUser,
  ) {
    await this.communitiesService.deletePost(postId, user.id);
  }
}
