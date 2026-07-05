import { BookStatus, Prisma, TypeAcces } from "@prisma/client";
import { SearchRepository } from "./search.repository";
import { SearchService } from "./search.service";
import { SearchOrder } from "./dto";

describe("SearchService", () => {
  const repository = {
    searchBookIds: jest.fn(),
    countSearchResults: jest.fn(),
    findBooksByIds: jest.fn(),
    findTrigramSuggestions: jest.fn(),
    findSimpleSuggestions: jest.fn(),
  } as unknown as jest.Mocked<SearchRepository>;

  const cacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  let service: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SearchService(repository, cacheManager as never);
  });

  it("retourne les resultats dans l'ordre de pertinence SQL", async () => {
    repository.searchBookIds.mockResolvedValue([
      { id: "book-2", score: 3.2 },
      { id: "book-1", score: 1.4 },
    ]);
    repository.countSearchResults.mockResolvedValue(2);
    repository.findBooksByIds.mockResolvedValue([
      makeBook("book-1", "Reseaux"),
      makeBook("book-2", "Cybersecurite"),
    ]);

    const result = await service.search({
      q: "cyber",
      page: 1,
      limit: 20,
      order: SearchOrder.RELEVANCE,
    });

    expect(result.data.map(book => book.id)).toEqual(["book-2", "book-1"]);
    expect(result.data[0].relevanceScore).toBe(3.2);
    expect(result.meta.total).toBe(2);
    expect(result.suggestions).toEqual([]);
  });

  it("retourne des suggestions quand aucun livre ne correspond", async () => {
    repository.searchBookIds.mockResolvedValue([]);
    repository.countSearchResults.mockResolvedValue(0);
    repository.findBooksByIds.mockResolvedValue([]);
    cacheManager.get.mockResolvedValue(undefined);
    repository.findTrigramSuggestions.mockResolvedValue([
      { suggestion: "Cybersecurite pour debutants" },
      { suggestion: "Cybersecurite pour debutants" },
      { suggestion: "Architecture reseau" },
    ]);

    const result = await service.search({
      q: "cyber",
      page: 1,
      limit: 20,
      order: SearchOrder.RELEVANCE,
    });

    expect(result.suggestions).toEqual([
      "Cybersecurite pour debutants",
      "Architecture reseau",
    ]);
    expect(cacheManager.set).toHaveBeenCalledWith(
      "search:suggestions:cyber",
      result.suggestions,
      60_000
    );
  });

  it("utilise le cache pour l'autocompletion", async () => {
    cacheManager.get.mockResolvedValue(["Cybersecurite"]);

    await expect(service.getSuggestions("Cyber")).resolves.toEqual([
      "Cybersecurite",
    ]);
    expect(repository.findTrigramSuggestions).not.toHaveBeenCalled();
  });

  it("fallback sur une recherche simple si pg_trgm est indisponible", async () => {
    cacheManager.get.mockResolvedValue(undefined);
    repository.findTrigramSuggestions.mockRejectedValue(
      new Error("extension missing")
    );
    repository.findSimpleSuggestions.mockResolvedValue([
      { titre: "Cybersecurite", auteur: "Awa Ndiaye" },
      { titre: "Cybersecurite", auteur: "Awa Ndiaye" },
    ]);

    await expect(service.getSuggestions("cyber")).resolves.toEqual([
      "Cybersecurite",
      "Awa Ndiaye",
    ]);
  });
});

function makeBook(id: string, titre: string) {
  return {
    id,
    titre,
    auteur: "Awa Ndiaye",
    categorie: "Informatique & Cybersecurite",
    filiere: null,
    description: null,
    typeAcces: TypeAcces.BORROW_OR_BUY,
    status: BookStatus.PUBLISHED,
    prixAchat: 2000,
    prixLocation7j: 500,
    prixLocation30j: 800,
    noteMoyenne: new Prisma.Decimal(4.5),
    reviewsCount: 10,
    nbVues: 100,
    nbEmprunts: 20,
    featured: false,
    coverUrl: null,
    createdAt: new Date("2026-05-27T00:00:00.000Z"),
    authorProfile: null,
  };
}
