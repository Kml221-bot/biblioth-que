import { CACHE_MANAGER, Cache } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { OpenLibraryBookDto, OpenLibrarySearchResultDto } from "./dto";

const BASE_URL = "https://openlibrary.org";
const COVERS_URL = "https://covers.openlibrary.org/b";
const SEARCH_FIELDS =
  "key,title,author_name,first_publish_year,number_of_pages_median,isbn,subject,cover_i,publisher";
const CACHE_TTL_MS = 60 * 60 * 1_000; // 1 heure

// Types bruts renvoyés par l'API OpenLibrary
interface OlSearchDoc {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  isbn?: string[];
  subject?: string[];
  cover_i?: number;
  publisher?: string[];
}

interface OlIsbnEntry {
  key?: string;
  title?: string;
  authors?: Array<{ name: string }>;
  publish_date?: string;
  number_of_pages?: number;
  subjects?: Array<string | { name: string }>;
  cover?: { small?: string; medium?: string; large?: string };
  publishers?: Array<{ name: string }>;
}

@Injectable()
export class OpenLibraryService {
  private readonly logger = new Logger(OpenLibraryService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  // ─── Recherche par texte libre ──────────────────────────────
  async searchBooks(query: string, limit = 10): Promise<OpenLibrarySearchResultDto> {
    const normalizedLimit = Math.min(Math.max(1, limit), 20);
    const cacheKey = `ol:search:${query.trim().toLowerCase()}:${normalizedLimit}`;

    const cached = await this.cache.get<OpenLibrarySearchResultDto>(cacheKey);
    if (cached) return cached;

    const url =
      `${BASE_URL}/search.json?q=${encodeURIComponent(query.trim())}` +
      `&fields=${SEARCH_FIELDS}&limit=${normalizedLimit}&lang=fre`;

    const data = await this.fetchJson<{ numFound?: number; docs?: OlSearchDoc[] }>(url);
    const result: OpenLibrarySearchResultDto = {
      total: data.numFound ?? 0,
      books: (data.docs ?? []).map(doc => this.mapDoc(doc)),
    };

    await this.cache.set(cacheKey, result, CACHE_TTL_MS);
    return result;
  }

  // ─── Recherche par ISBN ──────────────────────────────────────
  async getByIsbn(isbn: string): Promise<OpenLibraryBookDto | null> {
    const clean = isbn.replace(/[-\s]/g, "");
    const cacheKey = `ol:isbn:${clean}`;

    const cached = await this.cache.get<OpenLibraryBookDto | null>(cacheKey);
    if (cached !== undefined && cached !== null) return cached;

    const url = `${BASE_URL}/api/books?bibkeys=ISBN:${clean}&jscmd=data&format=json`;
    const data = await this.fetchJson<Record<string, OlIsbnEntry>>(url);
    const entry = data[`ISBN:${clean}`];

    if (!entry) {
      await this.cache.set(cacheKey, null, CACHE_TTL_MS);
      return null;
    }

    const result: OpenLibraryBookDto = {
      key: entry.key ?? "",
      title: entry.title ?? "Sans titre",
      authors: (entry.authors ?? []).map(a => a.name),
      publishYear: entry.publish_date ? parseInt(entry.publish_date, 10) : undefined,
      pages: entry.number_of_pages,
      isbn: [clean],
      subjects: (entry.subjects ?? [])
        .map(s => (typeof s === "string" ? s : s.name))
        .slice(0, 8),
      coverUrl: entry.cover?.large ?? entry.cover?.medium ?? null,
      publisher: entry.publishers?.[0]?.name,
    };

    await this.cache.set(cacheKey, result, CACHE_TTL_MS);
    return result;
  }

  // ─── Helpers ─────────────────────────────────────────────────
  private async fetchJson<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      headers: { "Accept": "application/json", "User-Agent": "BiblioTech/1.0" },
    });
    if (!res.ok) {
      throw new Error(`Open Library API erreur HTTP ${res.status} — ${url}`);
    }
    return res.json() as Promise<T>;
  }

  private mapDoc(doc: OlSearchDoc): OpenLibraryBookDto {
    return {
      key: doc.key ?? "",
      title: doc.title ?? "Sans titre",
      authors: Array.isArray(doc.author_name) ? doc.author_name.slice(0, 3) : [],
      publishYear: doc.first_publish_year,
      pages: doc.number_of_pages_median,
      isbn: Array.isArray(doc.isbn) ? doc.isbn.slice(0, 3) : [],
      subjects: Array.isArray(doc.subject) ? doc.subject.slice(0, 5) : [],
      coverUrl: doc.cover_i
        ? `${COVERS_URL}/id/${doc.cover_i}-M.jpg`
        : null,
      publisher: Array.isArray(doc.publisher) ? doc.publisher[0] : undefined,
    };
  }
}
