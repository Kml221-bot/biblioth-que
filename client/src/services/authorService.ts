import { supabase } from '@/lib/supabase';

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('AUTH_REQUIRED');
  return fetch(`/api/authors${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      ...(options.headers || {}),
    },
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export interface AuthorDashboardData {
  author: {
    id: string;
    nom_plume: string;
    bio: string | null;
    wave_number: string | null;
    solde_disponible: number;
    statut: string;
    verified: boolean;
  };
  stats: {
    books: number;
    publishedBooks: number;
    pendingBooks: number;
    sales: number;
    revenueFcfa: number;
    activeReaders: number;
  };
  balance: {
    availableFcfa: number;
    canWithdraw: boolean;
    minimumFcfa: number;
  };
  recentBooks: Array<{
    id: string;
    titre: string;
    status: string;
    prix_achat: number;
    prix_location: number;
    created_at: string;
  }>;
}

export async function getAuthorDashboard(): Promise<AuthorDashboardData | null> {
  const res = await authFetch('/dashboard');
  if (res.status === 403) return null;
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Erreur');
  return res.json();
}

export async function registerAsAuthor(data: {
  nom_plume: string;
  bio: string;
  wave_number: string;
  identityDocument?: { dataUrl: string; filename: string } | null;
}): Promise<void> {
  const res = await authFetch('/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || 'Erreur inscription');
}

export async function submitAuthorBook(data: {
  titre: string;
  auteur: string;
  categorie: string;
  description: string;
  extract: string;
  prix_achat: number;
  prix_location: number;
  file: { dataUrl: string; filename: string };
  cover?: { dataUrl: string; filename: string } | null;
}): Promise<void> {
  const res = await authFetch('/books', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || 'Erreur soumission livre');
}

export async function requestWithdrawal(amount: number, wave_number: string): Promise<void> {
  const res = await authFetch('/withdraw', {
    method: 'POST',
    body: JSON.stringify({ amount, wave_number }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || 'Erreur retrait');
}
