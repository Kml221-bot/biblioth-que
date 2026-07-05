import { CACHE_MANAGER, Cache } from "@nestjs/cache-manager";
import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import {
  AiChatResponseDto,
  AiQuizResponseDto,
  AiRecommendationDto,
  AiSummaryResponseDto,
  ExtractBookTextResponseDto,
  ChatMessageDto,
  IndexBookTextDto,
  IndexBookTextResponseDto,
} from "./dto";
import { AiRepository } from "./ai.repository";
import { BookTextExtractorService } from "./book-text-extractor.service";

type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    @Inject(AiRepository)
    private readonly aiRepository: AiRepository,
    @Inject(BookTextExtractorService)
    private readonly bookTextExtractorService: BookTextExtractorService,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache
  ) {}

  async chat(userId: string, dto: ChatMessageDto): Promise<AiChatResponseDto> {
    await this.ensureHourlyQuota(userId);
    const language = this.detectLanguage(dto.message);
    const messages: OpenRouterMessage[] = [];
    let systemPrompt = this.generalSystemPrompt(language);

    if (dto.bookContextId) {
      const [book, hasAccess] = await Promise.all([
        this.aiRepository.findBookContext(dto.bookContextId),
        this.aiRepository.userHasBookAccess(userId, dto.bookContextId),
      ]);

      if (!book) {
        throw new NotFoundException("Livre introuvable");
      }

      if (!hasAccess) {
        throw new ForbiddenException(
          "Vous devez avoir acces au livre pour utiliser son contexte IA"
        );
      }

      systemPrompt = this.bookSystemPrompt(book, language);
    }

    messages.push({ role: "system", content: systemPrompt });
    for (const item of dto.history ?? []) {
      messages.push({ role: item.role, content: item.content });
    }
    messages.push({ role: "user", content: dto.message });

    const message = await this.callOpenRouter(
      messages,
      this.fallbackChatMessage(language)
    );

    this.logger.debug(
      `Message BibliAI anonymise userId=${userId} lang=${language}`
    );

    return {
      message,
      language,
      bookContextId: dto.bookContextId,
    };
  }

  async generateSummary(bookId: string): Promise<AiSummaryResponseDto> {
    const cacheKey = `ai:summary:${bookId}`;
    const cached = await this.cacheManager.get<AiSummaryResponseDto>(cacheKey);

    if (cached) {
      return cached;
    }

    const book = await this.aiRepository.findBookContext(bookId);

    if (!book) {
      throw new NotFoundException("Livre introuvable");
    }

    const raw = await this.callOpenRouter(
      [
        {
          role: "system",
          content:
            "Tu resumas les livres pour des etudiants senegalais. Reponds en JSON strict.",
        },
        {
          role: "user",
          content: `Resume ce livre en 5 points cles + 1 citation marquante. Livre: ${this.renderBookContext(book)}`,
        },
      ],
      JSON.stringify({
        points: this.localSummaryPoints(book),
        citation:
          book.description?.slice(0, 140) ??
          "Citation indisponible dans le contenu actuel.",
      })
    );
    const summary = this.safeParseJson<AiSummaryResponseDto>(raw, {
      points: this.localSummaryPoints(book),
      citation:
        book.description?.slice(0, 140) ??
        "Citation indisponible dans le contenu actuel.",
    });

    await this.cacheManager.set(cacheKey, summary, 86_400_000);

    return summary;
  }

  async generateQuiz(bookId: string): Promise<AiQuizResponseDto> {
    const book = await this.aiRepository.findBookContext(bookId);

    if (!book) {
      throw new NotFoundException("Livre introuvable");
    }

    const raw = await this.callOpenRouter(
      [
        {
          role: "system",
          content:
            'Genere un quiz QCM en JSON strict: { "questions": [{ "question": string, "options": string[4], "difficulty": "facile|moyenne|difficile" }], "correctAnswers": number[] }.',
        },
        {
          role: "user",
          content: `Cree 10 questions QCM sur ce livre, 5 faciles, 3 moyennes, 2 difficiles. ${this.renderBookContext(book)}`,
        },
      ],
      JSON.stringify(this.localQuiz(book.titre))
    );

    return this.safeParseJson<AiQuizResponseDto>(
      raw,
      this.localQuiz(book.titre)
    );
  }

  async getRecommendations(userId: string): Promise<AiRecommendationDto[]> {
    const cacheKey = `ai:recommendations:${userId}`;
    const cached = await this.cacheManager.get<AiRecommendationDto[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const profile =
      await this.aiRepository.findUserRecommendationProfile(userId);
    const readBooks = profile?.borrows.map(borrow => borrow.book) ?? [];
    const categories = profile?.stats?.categoriesFavorites?.length
      ? profile.stats.categoriesFavorites
      : Array.from(new Set(readBooks.map(book => book.categorie)));
    const candidates =
      await this.aiRepository.findAvailableBooksForRecommendations(
        categories,
        readBooks.map(book => book.id)
      );

    const recommendations = candidates.slice(0, 3).map(book => ({
      bookId: book.id,
      titre: book.titre,
      reason: `Proche de tes lectures en ${book.categorie}.`,
    }));

    await this.cacheManager.set(cacheKey, recommendations, 3_600_000);

    return recommendations;
  }

  async indexBookText(
    bookId: string,
    dto: IndexBookTextDto
  ): Promise<IndexBookTextResponseDto> {
    const book = await this.aiRepository.findBookForIndexing(bookId);

    if (!book) {
      throw new NotFoundException("Livre introuvable");
    }

    const normalizedPages = dto.pages
      .map(page => ({
        page: page.page,
        content: page.content.trim(),
      }))
      .filter(page => page.content.length > 0)
      .sort((a, b) => a.page - b.page);

    const indexedPages = await this.aiRepository.replaceBookPageTexts(
      bookId,
      normalizedPages
    );

    await Promise.all([
      this.cacheManager.del(`ai:summary:${bookId}`),
      this.cacheManager.del(`ai:book-context:${bookId}`),
    ]);

    return {
      bookId,
      indexedPages,
    };
  }

  async extractAndIndexBookText(
    bookId: string
  ): Promise<ExtractBookTextResponseDto> {
    const book = await this.aiRepository.findBookFileForExtraction(bookId);

    if (!book) {
      throw new NotFoundException("Livre introuvable");
    }

    const sourceUrl = book.fileUrl ?? book.extraitUrl;

    if (!sourceUrl) {
      throw new NotFoundException("Aucun fichier disponible pour ce livre");
    }

    const extraction =
      await this.bookTextExtractorService.extractFromUrl(sourceUrl);
    const indexedPages = await this.aiRepository.replaceBookPageTexts(
      bookId,
      extraction.pages
    );

    await Promise.all([
      this.cacheManager.del(`ai:summary:${bookId}`),
      this.cacheManager.del(`ai:book-context:${bookId}`),
    ]);

    return {
      bookId,
      indexedPages,
      sourceUrl,
      format: extraction.format,
    };
  }

  detectLanguage(message: string): "fr" | "wo" | "pu" {
    const normalized = message.toLowerCase();
    const wolofWords =
      /\b(nanga|na nga|jerejef|jërëjëf|waaw|déedéet|ndax|lan|looy|dama|sama|yaw|maa ngi)\b/i;
    const pularWords =
      /\b(no mbad|a jaaraama|mi yidi|himo|hol no|on jaraama|pulaar|pular|ɗum|ngol)\b/i;

    if (pularWords.test(normalized)) {
      return "pu";
    }

    if (wolofWords.test(normalized)) {
      return "wo";
    }

    return "fr";
  }

  private async ensureHourlyQuota(userId: string) {
    const key = `ai:quota:${userId}:${new Date().toISOString().slice(0, 13)}`;
    const current = (await this.cacheManager.get<number>(key)) ?? 0;

    if (current >= 30) {
      throw new HttpException(
        "Quota BibliAI atteint: 30 messages par heure",
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    await this.cacheManager.set(key, current + 1, 3_600_000);
  }

  private async callOpenRouter(
    messages: OpenRouterMessage[],
    fallback: string
  ) {
    const apiKey = this.configService.get<string>("OPENROUTER_API_KEY");

    if (!apiKey || apiKey === "dev") {
      return fallback;
    }

    try {
      const response = await axios.post(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          model: "mistralai/mistral-7b-instruct:free",
          messages,
          temperature: 0.3,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": this.configService.get<string>(
              "FRONTEND_URL",
              "https://biblio-flame.vercel.app"
            ),
            "X-Title": "BiblioTech",
          },
          timeout: 30_000,
        }
      );

      return response.data?.choices?.[0]?.message?.content?.trim() ?? fallback;
    } catch (error) {
      this.logger.warn(
        `OpenRouter indisponible: ${error instanceof Error ? error.message : "erreur inconnue"}`
      );
      return fallback;
    }
  }

  private generalSystemPrompt(language: "fr" | "wo" | "pu") {
    const languageInstruction = this.languageInstruction(language);

    return `Tu es BibliAI, tuteur pedagogique de BiblioTech pour des etudiants au Senegal. ${languageInstruction} Sois clair, utile et concis.`;
  }

  private bookSystemPrompt(
    book: NonNullable<Awaited<ReturnType<AiRepository["findBookContext"]>>>,
    language: "fr" | "wo" | "pu"
  ) {
    return `Tu as acces au livre "${book.titre}" de ${book.auteur}. ${this.languageInstruction(language)}
Reponds UNIQUEMENT sur la base de ce contenu. Si la reponse n'est pas dans le livre, dis-le clairement.
Contenu disponible: ${this.renderBookContext(book)}`;
  }

  private languageInstruction(language: "fr" | "wo" | "pu") {
    if (language === "wo") {
      return "La question est en wolof: reponds en wolof simple.";
    }

    if (language === "pu") {
      return "La question est en pular/pulaar: reponds en pular simple si possible.";
    }

    return "Reponds en francais.";
  }

  private renderBookContext(
    book: NonNullable<Awaited<ReturnType<AiRepository["findBookContext"]>>>
  ) {
    return [
      `Titre: ${book.titre}`,
      `Auteur: ${book.auteur}`,
      `Categorie: ${book.categorie}`,
      book.filiere ? `Filiere: ${book.filiere}` : undefined,
      book.description ? `Description/extrait: ${book.description}` : undefined,
      book.pageTexts.length > 0
        ? `Pages indexees:\n${book.pageTexts
            .map(page => `Page ${page.page}: ${page.content.slice(0, 1500)}`)
            .join("\n")}`
        : undefined,
      book.extraitUrl ? `Extrait URL: ${book.extraitUrl}` : undefined,
    ]
      .filter(Boolean)
      .join("\n");
  }

  private fallbackChatMessage(language: "fr" | "wo" | "pu") {
    if (language === "wo") {
      return "BibliAI duñu man a tontu léegi. Jéemaatal ci kanam.";
    }

    if (language === "pu") {
      return "BibliAI waawataa jaabawde jooni. Eto kadi yeeso.";
    }

    return "BibliAI est momentanement indisponible. Reessaie dans quelques instants.";
  }

  private localSummaryPoints(
    book: NonNullable<Awaited<ReturnType<AiRepository["findBookContext"]>>>
  ) {
    return [
      `Le livre traite de ${book.categorie}.`,
      `Il est ecrit par ${book.auteur}.`,
      book.filiere
        ? `Il peut aider les etudiants en ${book.filiere}.`
        : "Il peut aider les etudiants a progresser.",
      "Les idees principales doivent etre completees avec le contenu integral du livre.",
      "BibliAI pourra donner un resume plus riche apres indexation des pages.",
    ];
  }

  private localQuiz(title: string): AiQuizResponseDto {
    const questions = Array.from({ length: 10 }, (_, index) => ({
      question: `Question ${index + 1} sur ${title} ?`,
      options: ["Option A", "Option B", "Option C", "Option D"],
      difficulty: index < 5 ? "facile" : index < 8 ? "moyenne" : "difficile",
    })) as AiQuizResponseDto["questions"];

    return {
      questions,
      correctAnswers: Array.from({ length: 10 }, () => 0),
    };
  }

  private safeParseJson<T>(raw: string, fallback: T): T {
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "");
      return JSON.parse(cleaned) as T;
    } catch {
      return fallback;
    }
  }
}
