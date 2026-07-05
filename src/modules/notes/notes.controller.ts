import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CurrentUser } from "../../common/decorators";
import { ResponseDto } from "../../common/dto/response.dto";
import { JwtAuthGuard } from "../../common/guards";
import { AuthenticatedRequestUser } from "../auth/types/auth.types";
import {
  CreateNoteDto,
  NoteLikeResponseDto,
  NoteResponseDto,
  UpdateNoteDto,
} from "./dto";
import { NotesService } from "./notes.service";

@Controller("notes")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth("JWT-auth")
@ApiTags("Notes")
export class NotesController {
  constructor(@Inject(NotesService) private readonly notesService: NotesService) {}

  @Post()
  @ApiOperation({ summary: "Creer une note, un surlignage ou un signet" })
  @ApiResponse({
    status: 201,
    description: "Note creee",
    type: NoteResponseDto,
  })
  async create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() dto: CreateNoteDto
  ) {
    return ResponseDto.created(
      await this.notesService.createNote(user.id, dto),
      "Note creee"
    );
  }

  @Get("community/:communityId/:bookId")
  @ApiOperation({
    summary: "Lister les notes partagees d'une communaute sur un livre",
  })
  @ApiResponse({
    status: 200,
    description: "Notes communautaires",
    type: NoteResponseDto,
    isArray: true,
  })
  async getCommunityNotes(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param("communityId") communityId: string,
    @Param("bookId") bookId: string
  ) {
    return ResponseDto.ok(
      await this.notesService.getCommunityNotes(user.id, communityId, bookId)
    );
  }

  @Get(":bookId")
  @ApiOperation({
    summary: "Lister mes notes et les notes visibles sur un livre",
  })
  @ApiResponse({
    status: 200,
    description: "Notes du livre",
    type: NoteResponseDto,
    isArray: true,
  })
  async getBookNotes(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param("bookId") bookId: string
  ) {
    return ResponseDto.ok(
      await this.notesService.getBookNotes(user.id, bookId)
    );
  }

  @Patch(":id")
  @ApiOperation({ summary: "Mettre a jour une de mes notes" })
  @ApiResponse({
    status: 200,
    description: "Note mise a jour",
    type: NoteResponseDto,
  })
  async update(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param("id") id: string,
    @Body() dto: UpdateNoteDto
  ) {
    return ResponseDto.ok(
      await this.notesService.updateNote(id, user.id, dto),
      "Note mise a jour"
    );
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Supprimer une de mes notes" })
  @ApiResponse({ status: 204, description: "Note supprimee" })
  async delete(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param("id") id: string
  ) {
    await this.notesService.deleteNote(id, user.id);
  }

  @Post(":id/like")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Liker ou retirer le like d'une note partagee" })
  @ApiResponse({
    status: 200,
    description: "Like mis a jour",
    type: NoteLikeResponseDto,
  })
  async toggleLike(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param("id") id: string
  ) {
    return ResponseDto.ok(await this.notesService.toggleLike(id, user.id));
  }
}
