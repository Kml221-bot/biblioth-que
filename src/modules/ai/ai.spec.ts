import { HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AiRepository } from "./ai.repository";
import { AiService } from "./ai.service";
import { BookTextExtractorService } from "./book-text-extractor.service";

describe("AiService.detectLanguage", () => {
  const repository = {} as jest.Mocked<AiRepository>;
  const configService = {
    get: jest.fn(),
  } as unknown as ConfigService;
  const cache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };
  const extractor = {} as jest.Mocked<BookTextExtractorService>;
  const service = new AiService(
    repository,
    extractor,
    configService,
    cache as never
  );

  it("detecte le francais par defaut", () => {
    expect(service.detectLanguage("Explique moi ce livre simplement")).toBe(
      "fr"
    );
  });

  it("detecte le wolof", () => {
    expect(
      service.detectLanguage("Nanga def, ndax mën nga ma leeral lii ?")
    ).toBe("wo");
  });

  it("detecte le pular", () => {
    expect(
      service.detectLanguage("A jaaraama, mi yidi humpito e nde deftere")
    ).toBe("pu");
  });
});

describe("AiService.chat", () => {
  const repository = {
    findBookContext: jest.fn(),
    userHasBookAccess: jest.fn(),
    findBookForIndexing: jest.fn(),
    replaceBookPageTexts: jest.fn(),
    findBookFileForExtraction: jest.fn(),
  } as unknown as jest.Mocked<AiRepository>;
  const extractor = {
    extractFromUrl: jest.fn(),
  } as unknown as jest.Mocked<BookTextExtractorService>;
  const configService = {
    get: jest.fn((key: string) => {
      if (key === "OPENROUTER_API_KEY") {
        return "dev";
      }

      return undefined;
    }),
  } as unknown as ConfigService;
  const cache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };
  let service: AiService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AiService(
      repository,
      extractor,
      configService,
      cache as never
    );
  });

  it("bloque au dela de 30 messages par heure", async () => {
    cache.get.mockResolvedValue(30);

    await expect(
      service.chat("user-1", { message: "Bonjour" })
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  });

  it("retourne un fallback gracieux si OpenRouter est desactive en dev", async () => {
    cache.get.mockResolvedValue(0);

    const result = await service.chat("user-1", { message: "Bonjour" });

    expect(result.language).toBe("fr");
    expect(result.message).toContain("BibliAI");
    expect(cache.set).toHaveBeenCalled();
  });

  it("indexe les pages d'un livre et invalide le cache du resume", async () => {
    repository.findBookForIndexing.mockResolvedValue({ id: "book-1" });
    repository.replaceBookPageTexts.mockResolvedValue(2);
    const result = await service.indexBookText("book-1", {
      pages: [
        { page: 2, content: "Deuxieme page" },
        { page: 1, content: "Premiere page" },
      ],
    });

    expect(repository.replaceBookPageTexts).toHaveBeenCalledWith("book-1", [
      { page: 1, content: "Premiere page" },
      { page: 2, content: "Deuxieme page" },
    ]);
    expect(result.indexedPages).toBe(2);
    expect(cache.del).toHaveBeenCalledWith("ai:summary:book-1");
  });

  it("extrait automatiquement le fichier du livre et indexe les pages", async () => {
    repository.findBookFileForExtraction.mockResolvedValue({
      id: "book-1",
      fileUrl: "https://cdn.example.com/book.pdf",
      extraitUrl: null,
    });
    extractor.extractFromUrl.mockResolvedValue({
      format: "pdf",
      pages: [{ page: 1, content: "Page extraite" }],
    });
    repository.replaceBookPageTexts.mockResolvedValue(1);

    const result = await service.extractAndIndexBookText("book-1");

    expect(extractor.extractFromUrl).toHaveBeenCalledWith(
      "https://cdn.example.com/book.pdf"
    );
    expect(repository.replaceBookPageTexts).toHaveBeenCalledWith("book-1", [
      { page: 1, content: "Page extraite" },
    ]);
    expect(result).toEqual({
      bookId: "book-1",
      indexedPages: 1,
      sourceUrl: "https://cdn.example.com/book.pdf",
      format: "pdf",
    });
  });
});
