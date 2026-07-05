import { ConflictException, ForbiddenException } from "@nestjs/common";
import { BookStatus, TypeAcces } from "@prisma/client";
import { BooksRepository } from "./books.repository";
import { BooksService } from "./books.service";

describe("BooksService", () => {
  const cyberBook = {
    id: "book-cyber",
    titre: "Cybersecurite pour debutants",
    auteur: "Awa Ndiaye",
    categorie: "Informatique & Cybersecurite",
    filiere: null,
    description: null,
    typeAcces: TypeAcces.BORROW_OR_BUY,
    status: BookStatus.PUBLISHED,
    prixAchat: 2000,
    prixLocation7j: 500,
    prixLocation30j: 800,
    noteMoyenne: 4.5,
    reviewsCount: 4,
    nbVues: 10,
    nbEmprunts: 6,
    featured: true,
    coverUrl: null,
    createdAt: new Date(),
    authorProfile: null,
  };

  const mangaBook = {
    ...cyberBook,
    id: "book-manga",
    titre: "Manga campus",
    categorie: "Manga & BD",
  };

  const repository = {
    findManyWithFilters: jest.fn(),
    count: jest.fn(),
    findRawById: jest.fn(),
    findUserBookAccess: jest.fn(),
    findReviewByUserAndBook: jest.fn(),
    createReview: jest.fn(),
  } as unknown as jest.Mocked<BooksRepository>;

  const cache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  let service: BooksService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BooksService(repository, cache as never);
  });

  it("ordonne les listes selon les categories prioritaires de l’enquete", async () => {
    repository.findManyWithFilters.mockResolvedValue([
      mangaBook,
      cyberBook,
    ] as never);
    repository.count.mockResolvedValue(2);
    cache.get.mockResolvedValue(undefined);

    const result = await service.findAll({ page: 1, limit: 20 });

    expect(result.data.map(book => book.id)).toEqual([
      "book-cyber",
      "book-manga",
    ]);
    expect(result.meta.total).toBe(2);
    expect(cache.set).toHaveBeenCalled();
  });

  it("refuse un avis si l’utilisateur n’a ni emprunte ni achete le livre", async () => {
    repository.findRawById.mockResolvedValue(cyberBook as never);
    repository.findUserBookAccess.mockResolvedValue({
      hasAccess: false,
      isAlreadyBorrowed: false,
      isAlreadyPurchased: false,
    });

    await expect(
      service.createReview("book-cyber", "user-1", { note: 5 })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("refuse un deuxieme avis du meme utilisateur", async () => {
    repository.findRawById.mockResolvedValue(cyberBook as never);
    repository.findUserBookAccess.mockResolvedValue({
      hasAccess: true,
      isAlreadyBorrowed: true,
      isAlreadyPurchased: false,
    });
    repository.findReviewByUserAndBook.mockResolvedValue({
      id: "review-1",
    } as never);

    await expect(
      service.createReview("book-cyber", "user-1", { note: 5 })
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
