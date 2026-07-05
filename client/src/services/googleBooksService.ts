export interface GoogleBook {
  id: string;
  title: string;
  authors: string[];
  cover: string;
  coverFallback: string;
  publishedYear: number;
  rating: number;
  ratingsCount: number;
  description: string;
  previewLink: string;
  infoLink: string;
  category: string;
  pageCount: number;
  publisher: string;
  language: string;
  available: boolean;
  pdfUrl?: string;      // Lien PDF direct (Project Gutenberg, Open Library)
  readUrl?: string;     // Lien lecteur en ligne (Open Library, MangaDex)
  extract?: string;     // Extrait du premier chapitre
  prix_achat?: number;  // Prix d'achat du livre (BiblioTech)
  type?: string;        // 'payant' ou 'gratuit' (BiblioTech)
}

interface IndustryId {
  type: string;
  identifier: string;
}

interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string; medium?: string; large?: string; };
    previewLink?: string;
    infoLink?: string;
    publisher?: string;
    language?: string;
    industryIdentifiers?: IndustryId[];
  };
}

import { MOCK_BOOKS } from '@/data/mockBooks';

const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

function fixGoogleCover(url: string): string {
  if (!url) return '';
  // Détecter les images de mauvaise qualité ou les placeholders de Google
  if (
    url.includes('edge=curl') || 
    url.includes('placeholder') || 
    url.includes('not_found') ||
    url.includes('blank')
  ) {
    return '';
  }
  
  // Forcer la haute définition (zoom=2) et supprimer les bords blancs
  return url
    .replace('http://', 'https://')
    .replace(/zoom=\d+/, 'zoom=2')
    .replace('&edge=curl', '')
    .replace('&source=gbs_api', '');
}

function getIsbn(identifiers?: IndustryId[]): string {
  if (!identifiers) return '';
  const isbn13 = identifiers.find(i => i.type === 'ISBN_13');
  const isbn10 = identifiers.find(i => i.type === 'ISBN_10');
  return isbn13?.identifier || isbn10?.identifier || '';
}

function getOpenLibraryCover(isbn: string): string {
  if (!isbn) return '';
  // Utiliser la version large (L) pour la qualité
  return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
}

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.status === 429 && i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        continue;
      }
      return res;
    } catch (err) {
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
        continue;
      }
      throw err;
    }
  }
  return fetch(url); 
}

function mapVolume(volume: GoogleBooksVolume, category: string): GoogleBook {
  const info = volume.volumeInfo;

  const isbn = getIsbn(info.industryIdentifiers);
  const googleCover = fixGoogleCover(
    info.imageLinks?.large ||
    info.imageLinks?.medium ||
    info.imageLinks?.thumbnail ||
    info.imageLinks?.smallThumbnail ||
    ''
  );
  // Priorité : Google Books (haute déf) → Open Library (par ISBN) → vide
  const cover = googleCover || getOpenLibraryCover(isbn);
  const coverFallback = '';

  return {
    id: volume.id,
    title: info.title || 'Sans titre',
    authors: info.authors || ['Auteur inconnu'],
    cover,
    coverFallback,
    publishedYear: info.publishedDate ? parseInt(info.publishedDate.substring(0, 4), 10) : 0,
    rating: info.averageRating || (3.5 + Math.random() * 1.5),
    ratingsCount: info.ratingsCount || Math.floor(Math.random() * 2000 + 100),
    description: info.description || 'Aucune description disponible pour ce livre.',
    previewLink: info.previewLink || '',
    infoLink: info.infoLink || '',
    category,
    pageCount: info.pageCount || 0,
    publisher: info.publisher || '',
    language: info.language || 'fr',
    available: Math.random() > 0.2,
  };
}

export async function searchGoogleBooks(query: string, maxResults = 12): Promise<GoogleBook[]> {
  try {
    const params = new URLSearchParams({ q: query, maxResults: maxResults.toString(), printType: 'books' });
    const res = await fetchWithRetry(`${BASE_URL}?${params}`);
    if (!res.ok) throw new Error(`Erreur API: ${res.status}`);
    const data = await res.json();
    if (!data.items) {
      return MOCK_BOOKS.filter(b => 
        b.title.toLowerCase().includes(query.toLowerCase()) || 
        b.authors.some(a => a.toLowerCase().includes(query.toLowerCase()))
      );
    }
    return data.items.map((v: GoogleBooksVolume) => mapVolume(v, 'Recherche'));
  } catch (err) {
    console.error('Google Books search error:', err);
    return MOCK_BOOKS.filter(b => 
      b.title.toLowerCase().includes(query.toLowerCase()) || 
      b.authors.some(a => a.toLowerCase().includes(query.toLowerCase()))
    );
  }
}

export async function fetchBooksByQuery(query: string, category: string, maxResults = 8): Promise<GoogleBook[]> {
  try {
    const params = new URLSearchParams({ q: query, maxResults: maxResults.toString(), printType: 'books', orderBy: 'relevance' });
    const res = await fetchWithRetry(`${BASE_URL}?${params}`);
    if (!res.ok) throw new Error(`Erreur API: ${res.status}`);
    const data = await res.json();
    if (!data.items) {
      const filtered = MOCK_BOOKS.filter(b => b.category.toLowerCase() === category.toLowerCase());
      return filtered.length > 0 ? filtered : MOCK_BOOKS.slice(0, maxResults);
    }
    return data.items.map((v: GoogleBooksVolume) => mapVolume(v, category));
  } catch (err) {
    console.error('Google Books fetch error:', err);
    
    const filtered = MOCK_BOOKS.filter(b => b.category.toLowerCase() === category.toLowerCase());
    return filtered.length > 0 ? filtered : MOCK_BOOKS.slice(0, maxResults);
  }
}

export async function fetchRecommendations(): Promise<GoogleBook[]> {
  const queries = [
    'Victor Hugo roman', 'Albert Camus roman', 'Antoine de Saint-Exupéry',
    'Jules Verne aventure', 'Alexandre Dumas roman', 'Émile Zola roman'
  ];
  const query = queries[Math.floor(Math.random() * queries.length)];
  return fetchBooksByQuery(query, 'Recommandé', 6);
}
