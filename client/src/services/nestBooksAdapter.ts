import type { GoogleBook } from './googleBooksService';

interface NestBook {
  id: string;
  titre: string;
  auteur: string;
  categorie: string;
  description?: string | null;
  noteMoyenne?: number;
  reviewsCount?: number;
  coverUrl?: string | null;
  status?: string;
}

export function nestBookToGoogleBook(b: NestBook): GoogleBook {
  return {
    id: b.id,
    title: b.titre,
    authors: [b.auteur],
    description: b.description ?? '',
    category: b.categorie,
    publishedYear: 0,
    pageCount: 0,
    rating: Number(b.noteMoyenne ?? 0),
    ratingsCount: b.reviewsCount ?? 0,
    cover: b.coverUrl ?? '',
    coverFallback: '',
    available: b.status === 'publie' || b.status === undefined,
    previewLink: '',
    infoLink: '',
    publisher: '',
    language: 'fr',
    extract: b.description ?? '',
  };
}

export async function searchBooksViaNestJS(query: string): Promise<GoogleBook[]> {
  try {
    const res = await fetch(
      `/api/search?q=${encodeURIComponent(query)}&limit=20`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return [];
    const json = await res.json();
    const books: NestBook[] = json.data?.data ?? json.data ?? [];
    return books.map(nestBookToGoogleBook);
  } catch {
    return [];
  }
}

export async function fetchBooksViaNestJS(params?: Record<string, string>): Promise<GoogleBook[]> {
  try {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`/api/books${qs}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const json = await res.json();
    const books: NestBook[] = json.data?.data ?? json.data ?? [];
    return books.map(nestBookToGoogleBook);
  } catch {
    return [];
  }
}
