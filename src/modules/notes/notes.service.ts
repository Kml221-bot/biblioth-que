import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreateNoteDto,
  NoteLikeResponseDto,
  NoteResponseDto,
  UpdateNoteDto,
} from "./dto";
import { NotesRepository } from "./notes.repository";

type NoteRecord = NonNullable<Awaited<ReturnType<NotesRepository["findById"]>>>;

@Injectable()
export class NotesService {
  constructor(@Inject(NotesRepository) private readonly notesRepository: NotesRepository) {}

  async createNote(
    userId: string,
    dto: CreateNoteDto
  ): Promise<NoteResponseDto> {
    await this.ensureBookAccess(userId, dto.bookId);

    if (dto.sharedWithCommunityId) {
      await this.ensureCommunityMember(userId, dto.sharedWithCommunityId);
    }

    const note = await this.notesRepository.create({
      userId,
      bookId: dto.bookId,
      page: dto.page,
      type: dto.type,
      contenu: dto.contenu,
      couleur: dto.couleur,
      sharedWithCommunityId: dto.sharedWithCommunityId,
      isPublic: Boolean(dto.sharedWithCommunityId),
    });

    return this.toResponse(note);
  }

  async getBookNotes(userId: string, bookId: string) {
    await this.ensureBookAccess(userId, bookId);
    const communityIds =
      await this.notesRepository.findUserCommunityIds(userId);
    const notes = await this.notesRepository.findOwnedOrVisibleBookNotes(
      userId,
      bookId,
      communityIds
    );

    return notes.map(note => this.toResponse(note));
  }

  async getCommunityNotes(userId: string, communityId: string, bookId: string) {
    await this.ensureBookAccess(userId, bookId);
    await this.ensureCommunityMember(userId, communityId);
    const notes = await this.notesRepository.findCommunityNotes(
      communityId,
      bookId
    );

    return notes.map(note => this.toResponse(note));
  }

  async updateNote(id: string, userId: string, dto: UpdateNoteDto) {
    const note = await this.ensureOwnedNote(id, userId);
    const updatedNote = await this.notesRepository.update(note.id, {
      page: dto.page,
      type: dto.type,
      contenu: dto.contenu,
      couleur: dto.couleur,
    });

    return this.toResponse(updatedNote);
  }

  async deleteNote(id: string, userId: string) {
    await this.ensureOwnedNote(id, userId);
    await this.notesRepository.delete(id);
  }

  async toggleLike(id: string, userId: string): Promise<NoteLikeResponseDto> {
    const note = await this.notesRepository.findById(id);

    if (!note) {
      throw new NotFoundException("Note introuvable");
    }

    if (note.userId === userId) {
      throw new ForbiddenException(
        "Vous ne pouvez pas liker votre propre note"
      );
    }

    if (note.sharedWithCommunityId) {
      await this.ensureCommunityMember(userId, note.sharedWithCommunityId);
    } else if (!note.isPublic) {
      throw new ForbiddenException("Cette note n'est pas partagee");
    }

    return this.notesRepository.toggleLike(id, userId);
  }

  private async ensureBookAccess(userId: string, bookId: string) {
    const hasAccess = await this.notesRepository.userHasBookAccess(
      userId,
      bookId
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        "Vous devez avoir acces au livre pour prendre des notes"
      );
    }
  }

  private async ensureCommunityMember(userId: string, communityId: string) {
    const community = await this.notesRepository.communityExists(communityId);

    if (!community) {
      throw new NotFoundException("Communaute introuvable");
    }

    const isMember = await this.notesRepository.isCommunityMember(
      userId,
      communityId
    );

    if (!isMember) {
      throw new ForbiddenException("Vous devez etre membre de la communaute");
    }
  }

  private async ensureOwnedNote(id: string, userId: string) {
    const note = await this.notesRepository.findById(id);

    if (!note) {
      throw new NotFoundException("Note introuvable");
    }

    if (note.userId !== userId) {
      throw new ForbiddenException(
        "Vous ne pouvez modifier que vos propres notes"
      );
    }

    return note;
  }

  private toResponse(note: NoteRecord): NoteResponseDto {
    return {
      id: note.id,
      bookId: note.bookId,
      page: note.page,
      type: note.type,
      contenu: note.contenu,
      couleur: note.couleur,
      likesCount: note.likesCount,
      isPublic: note.isPublic,
      sharedWithCommunityId: note.sharedWithCommunityId,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      user: {
        id: note.user.id,
        nom: note.user.nom,
        prenom: note.user.prenom,
      },
    };
  }
}
