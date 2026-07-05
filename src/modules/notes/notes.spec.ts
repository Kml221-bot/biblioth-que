import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { NoteColor, NoteType } from "@prisma/client";
import { NotesRepository } from "./notes.repository";
import { NotesService } from "./notes.service";

const baseNote = {
  id: "note-1",
  userId: "user-1",
  bookId: "book-1",
  sharedWithCommunityId: null,
  page: 7,
  type: NoteType.NOTE,
  contenu: "Passage important",
  couleur: NoteColor.YELLOW,
  likesCount: 0,
  isPublic: false,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  user: {
    id: "user-1",
    nom: "Diop",
    prenom: "Awa",
  },
};

describe("NotesService", () => {
  const repository = {
    userHasBookAccess: jest.fn(),
    communityExists: jest.fn(),
    isCommunityMember: jest.fn(),
    findUserCommunityIds: jest.fn(),
    create: jest.fn(),
    findOwnedOrVisibleBookNotes: jest.fn(),
    findCommunityNotes: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    toggleLike: jest.fn(),
  } as unknown as jest.Mocked<NotesRepository>;

  let service: NotesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotesService(repository);
  });

  it("cree une note si l'utilisateur a acces au livre", async () => {
    repository.userHasBookAccess.mockResolvedValue(true);
    repository.create.mockResolvedValue(baseNote as never);

    const result = await service.createNote("user-1", {
      bookId: "book-1",
      page: 7,
      type: NoteType.NOTE,
      contenu: "Passage important",
      couleur: NoteColor.YELLOW,
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        bookId: "book-1",
        page: 7,
        isPublic: false,
      })
    );
    expect(result.id).toBe("note-1");
  });

  it("refuse une note sans acces au livre", async () => {
    repository.userHasBookAccess.mockResolvedValue(false);

    await expect(
      service.createNote("user-1", {
        bookId: "book-1",
        page: 7,
        type: NoteType.NOTE,
        couleur: NoteColor.YELLOW,
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("refuse le partage si l'utilisateur n'est pas membre de la communaute", async () => {
    repository.userHasBookAccess.mockResolvedValue(true);
    repository.communityExists.mockResolvedValue({ id: "community-1" });
    repository.isCommunityMember.mockResolvedValue(false);

    await expect(
      service.createNote("user-1", {
        bookId: "book-1",
        page: 7,
        type: NoteType.HIGHLIGHT,
        couleur: NoteColor.GREEN,
        sharedWithCommunityId: "community-1",
      })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("liste les notes communautaires seulement pour un membre", async () => {
    repository.userHasBookAccess.mockResolvedValue(true);
    repository.communityExists.mockResolvedValue({ id: "community-1" });
    repository.isCommunityMember.mockResolvedValue(true);
    repository.findCommunityNotes.mockResolvedValue([
      {
        ...baseNote,
        sharedWithCommunityId: "community-1",
        isPublic: true,
      },
    ] as never);

    const result = await service.getCommunityNotes(
      "user-1",
      "community-1",
      "book-1"
    );

    expect(result).toHaveLength(1);
    expect(repository.findCommunityNotes).toHaveBeenCalledWith(
      "community-1",
      "book-1"
    );
  });

  it("refuse de liker sa propre note", async () => {
    repository.findById.mockResolvedValue(baseNote as never);

    await expect(service.toggleLike("note-1", "user-1")).rejects.toBeInstanceOf(
      ForbiddenException
    );
  });

  it("toggle le like sur une note communautaire accessible", async () => {
    repository.findById.mockResolvedValue({
      ...baseNote,
      userId: "user-2",
      sharedWithCommunityId: "community-1",
      isPublic: true,
    } as never);
    repository.communityExists.mockResolvedValue({ id: "community-1" });
    repository.isCommunityMember.mockResolvedValue(true);
    repository.toggleLike.mockResolvedValue({ liked: true, likesCount: 1 });

    await expect(service.toggleLike("note-1", "user-1")).resolves.toEqual({
      liked: true,
      likesCount: 1,
    });
  });

  it("retourne 404 si la communaute partagee n'existe pas", async () => {
    repository.userHasBookAccess.mockResolvedValue(true);
    repository.communityExists.mockResolvedValue(null);

    await expect(
      service.createNote("user-1", {
        bookId: "book-1",
        page: 7,
        type: NoteType.NOTE,
        couleur: NoteColor.YELLOW,
        sharedWithCommunityId: "community-1",
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
