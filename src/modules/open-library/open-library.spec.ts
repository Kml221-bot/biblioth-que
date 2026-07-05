import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";
import { OpenLibraryService } from "./open-library.service";

const MOCK_SEARCH_RESPONSE = {
  numFound: 2,
  docs: [
    {
      key: "/works/OL45804W",
      title: "Candide",
      author_name: ["Voltaire"],
      first_publish_year: 1759,
      number_of_pages_median: 128,
      isbn: ["9782070360437"],
      subject: ["Philosophical fiction", "Satire"],
      cover_i: 8393898,
      publisher: ["Gallimard"],
    },
    {
      key: "/works/OL12345W",
      title: "Zadig",
      author_name: ["Voltaire"],
      first_publish_year: 1747,
    },
  ],
};

const MOCK_ISBN_RESPONSE = {
  "ISBN:9782070360437": {
    key: "/books/OL7353617M",
    title: "Candide ou l'Optimisme",
    authors: [{ name: "Voltaire" }],
    publish_date: "1759",
    number_of_pages: 128,
    subjects: ["Philosophical fiction"],
    cover: { large: "https://covers.openlibrary.org/b/id/8393898-L.jpg" },
    publishers: [{ name: "Gallimard" }],
  },
};

describe("OpenLibraryService", () => {
  let service: OpenLibraryService;
  const mockCache = { get: jest.fn(), set: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OpenLibraryService,
        { provide: CACHE_MANAGER, useValue: mockCache },
      ],
    }).compile();

    service = module.get(OpenLibraryService);
    jest.clearAllMocks();
  });

  describe("searchBooks", () => {
    it("retourne le cache si disponible", async () => {
      const cached = { total: 1, books: [{ title: "Candide" }] };
      mockCache.get.mockResolvedValue(cached);

      const result = await service.searchBooks("Voltaire");
      expect(result).toEqual(cached);
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it("appelle l'API et map correctement les livres", async () => {
      mockCache.get.mockResolvedValue(null);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_SEARCH_RESPONSE),
      }) as jest.Mock;

      const result = await service.searchBooks("Voltaire", 10);
      expect(result.total).toBe(2);
      expect(result.books).toHaveLength(2);
      expect(result.books[0].title).toBe("Candide");
      expect(result.books[0].authors).toEqual(["Voltaire"]);
      expect(result.books[0].publishYear).toBe(1759);
      expect(result.books[0].coverUrl).toContain("covers.openlibrary.org");
      expect(mockCache.set).toHaveBeenCalled();
    });

    it("limite à 20 résultats maximum", async () => {
      mockCache.get.mockResolvedValue(null);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ numFound: 0, docs: [] }),
      }) as jest.Mock;

      await service.searchBooks("test", 100);
      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(fetchUrl).toContain("limit=20");
    });

    it("lève une erreur si l'API est indisponible", async () => {
      mockCache.get.mockResolvedValue(null);
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
      }) as jest.Mock;

      await expect(service.searchBooks("test")).rejects.toThrow("Open Library API erreur HTTP 503");
    });
  });

  describe("getByIsbn", () => {
    it("retourne null si l'ISBN est inconnu", async () => {
      mockCache.get.mockResolvedValue(undefined);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }) as jest.Mock;

      const result = await service.getByIsbn("0000000000");
      expect(result).toBeNull();
    });

    it("retourne les métadonnées complètes pour un ISBN valide", async () => {
      mockCache.get.mockResolvedValue(undefined);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(MOCK_ISBN_RESPONSE),
      }) as jest.Mock;

      const result = await service.getByIsbn("978-2-07-036043-7");
      expect(result).not.toBeNull();
      expect(result?.title).toBe("Candide ou l'Optimisme");
      expect(result?.authors).toEqual(["Voltaire"]);
      expect(result?.pages).toBe(128);
      expect(result?.publisher).toBe("Gallimard");
      expect(result?.coverUrl).toContain("openlibrary.org");
    });

    it("nettoie les tirets de l'ISBN avant la requête", async () => {
      mockCache.get.mockResolvedValue(undefined);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }) as jest.Mock;

      await service.getByIsbn("978-2-07-036043-7");
      const fetchUrl = (global.fetch as jest.Mock).mock.calls[0][0] as string;
      expect(fetchUrl).toContain("9782070360437");
      expect(fetchUrl).not.toContain("-");
    });
  });
});
