import { supabaseAdmin } from "./supabase.js";

type PdfJsModule = {
  getDocument: (options: Record<string, unknown>) => { promise: Promise<PdfDocument> };
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
  destroy?: () => Promise<void>;
};

type PdfPage = {
  getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
};

export interface BookForIndexing {
  id: string;
  titre: string;
  pdf_url?: string | null;
  read_url?: string | null;
  pages_count?: number | null;
}

export interface IndexBookOptions {
  force?: boolean;
  maxPages?: number;
}

export interface IndexedPage {
  page_number: number;
  content: string;
}

export interface IndexBookResult {
  bookId: string;
  title: string;
  sourceUrl: string | null;
  indexedPages: number;
  totalPages: number;
  skipped: boolean;
  reason?: string;
}

const DEFAULT_MAX_PAGES = Number(process.env.BIBLIAI_INDEX_MAX_PAGES || 80);
const MAX_PDF_BYTES = Number(process.env.BIBLIAI_INDEX_MAX_BYTES || 80 * 1024 * 1024);
const PDF_FETCH_TIMEOUT_MS = Number(process.env.BIBLIAI_INDEX_TIMEOUT_MS || 15000);

function getAllowedHosts(): string[] {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : "";
  const defaults = [
    supabaseHost,
    "openlibrary.org",
    "archive.org",
    "gutenberg.org",
    "www.gutenberg.org",
    "mangadex.org",
    "www.mangadex.org",
    "linuxcommand.org",
    "www.linuxcommand.org",
    "web.mit.edu",
    "standardebooks.org",
    "www.standardebooks.org",
    "fr.wikisource.org",
    "wikisource.org",
  ].filter(Boolean);

  const envHosts = process.env.PDF_INDEX_ALLOWED_HOSTS
    ? process.env.PDF_INDEX_ALLOWED_HOSTS.split(",").map(host => host.trim().toLowerCase())
    : [];
  const defaultHosts = defaults.map(host => host.trim().toLowerCase());
  return Array.from(new Set([...defaultHosts, ...envHosts])).filter(Boolean);
}

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return getAllowedHosts().some(allowed => host === allowed || host.endsWith(`.${allowed}`));
}

function cleanPageText(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getPdfSourceUrl(book: BookForIndexing): string | null {
  const candidates = [book.pdf_url, book.read_url].filter(Boolean) as string[];
  return candidates.find(url => /\.pdf(\?|#|$)/i.test(url) || url.includes("application/pdf")) || candidates[0] || null;
}

function parseSupabaseStorageUrl(rawUrl: string): { bucket: string; path: string } | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const marker = "/storage/v1/object/";
  const markerIndex = url.pathname.indexOf(marker);
  if (markerIndex === -1) return null;

  const afterMarker = url.pathname.slice(markerIndex + marker.length);
  const parts = afterMarker.split("/").filter(Boolean);
  if (parts[0] === "public" || parts[0] === "sign") parts.shift();
  const bucket = parts.shift();
  if (!bucket || parts.length === 0) return null;

  return {
    bucket,
    path: decodeURIComponent(parts.join("/")),
  };
}

async function downloadFromSupabaseStorage(rawUrl: string): Promise<Buffer | null> {
  const storageRef = parseSupabaseStorageUrl(rawUrl);
  if (!storageRef) return null;

  const { data, error } = await supabaseAdmin.storage
    .from(storageRef.bucket)
    .download(storageRef.path);

  if (error || !data) return null;

  const buffer = Buffer.from(await data.arrayBuffer());
  if (buffer.byteLength > MAX_PDF_BYTES) {
    throw new Error("PDF_TOO_LARGE");
  }

  return buffer;
}

async function downloadFromUrl(rawUrl: string): Promise<Buffer> {
  const storageBuffer = await downloadFromSupabaseStorage(rawUrl);
  if (storageBuffer) return storageBuffer;

  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol) || !isAllowedHost(url.hostname)) {
    throw new Error("PDF_HOST_NOT_ALLOWED");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PDF_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/pdf,*/*;q=0.8",
        "user-agent": "BiblioTechIndexer/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`PDF_FETCH_FAILED_${response.status}`);
    }

    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > MAX_PDF_BYTES) {
      throw new Error("PDF_TOO_LARGE");
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_PDF_BYTES) {
      throw new Error("PDF_TOO_LARGE");
    }

    return buffer;
  } finally {
    clearTimeout(timeout);
  }
}

async function extractPdfPages(buffer: Buffer, maxPages: number): Promise<{ totalPages: number; pages: IndexedPage[] }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs") as PdfJsModule;
  const task = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableFontFace: true,
    isEvalSupported: false,
    useSystemFonts: false,
  });
  const doc = await task.promise;

  try {
    const totalPages = doc.numPages;
    const pagesToRead = Math.min(totalPages, maxPages);
    const pages: IndexedPage[] = [];

    for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const content = cleanPageText(textContent.items.map(item => item.str || "").join(" "));

      if (content) {
        pages.push({ page_number: pageNumber, content });
      }
    }

    return { totalPages, pages };
  } finally {
    await doc.destroy?.();
  }
}

async function existingPageCount(bookId: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("book_page_texts")
    .select("id", { count: "exact", head: true })
    .eq("book_id", bookId);

  if (error) return 0;
  return count || 0;
}

export async function indexBookPdfText(
  book: BookForIndexing,
  options: IndexBookOptions = {},
): Promise<IndexBookResult> {
  const maxPages = Math.min(Math.max(Number(options.maxPages || DEFAULT_MAX_PAGES), 1), 300);
  const sourceUrl = getPdfSourceUrl(book);

  if (!sourceUrl) {
    return {
      bookId: book.id,
      title: book.titre,
      sourceUrl: null,
      indexedPages: 0,
      totalPages: 0,
      skipped: true,
      reason: "NO_PDF_URL",
    };
  }

  if (!options.force && await existingPageCount(book.id) > 0) {
    return {
      bookId: book.id,
      title: book.titre,
      sourceUrl,
      indexedPages: 0,
      totalPages: Number(book.pages_count || 0),
      skipped: true,
      reason: "ALREADY_INDEXED",
    };
  }

  const buffer = await downloadFromUrl(sourceUrl);
  const { totalPages, pages } = await extractPdfPages(buffer, maxPages);

  if (options.force) {
    await supabaseAdmin.from("book_page_texts").delete().eq("book_id", book.id);
  }

  if (pages.length > 0) {
    const { error } = await supabaseAdmin
      .from("book_page_texts")
      .upsert(
        pages.map(page => ({
          book_id: book.id,
          page_number: page.page_number,
          content: page.content,
          source: "pdfjs",
        })),
        { onConflict: "book_id,page_number" },
      );

    if (error) throw error;
  }

  if (totalPages && totalPages !== book.pages_count) {
    await supabaseAdmin
      .from("books")
      .update({ pages_count: totalPages, updated_at: new Date().toISOString() })
      .eq("id", book.id);
  }

  return {
    bookId: book.id,
    title: book.titre,
    sourceUrl,
    indexedPages: pages.length,
    totalPages,
    skipped: false,
  };
}

export async function fetchBooksForTextIndexing(limit: number): Promise<BookForIndexing[]> {
  const { data, error } = await supabaseAdmin
    .from("books")
    .select("id,titre,pdf_url,read_url,pages_count")
    .eq("status", "publie")
    .or("pdf_url.not.is.null,read_url.not.is.null")
    .limit(limit);

  if (error) throw error;
  return data || [];
}
