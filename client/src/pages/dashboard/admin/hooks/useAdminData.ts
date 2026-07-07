
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

// ── Types ────────────────────────────────────────────────────

export interface AdminStats {
  totalBooks: number;
  totalUsers: number;
  activeBorrows: number;
  overdueBorrows: number;
  activeSubscriptions: number;
  revenueMonth: number;
}

export interface AdminBookRow {
  id: string;
  titre: string;
  auteur: string;
  categorie: string;
  prix_achat: number;
  prix_location: number;
  type: string;
  format: string;
  status: string;
  pages_count: number;
  langue: string;
  description: string | null;
  pdf_url: string | null;
  read_url: string | null;
  cover_url: string | null;
  watermark_enabled: boolean;
  created_at: string;
}

export interface AdminUserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  plan: string;
  wallet_balance: number;
  is_active: boolean;
  whatsapp_number: string | null;
  filiere: string | null;
  universite: string | null;
  created_at: string;
}

export interface AdminBorrowRow {
  id: string;
  user_id: string;
  book_id: string;
  debut: string;
  fin_prevue: string;
  fin_reelle: string | null;
  statut: string;
  penalite_fcfa: number;
  jours_retard: number;
  prolongation_auto_utilisee: boolean;
  // Jointures
  user_email?: string;
  user_name?: string;
  book_titre?: string;
}

export interface AdminTransactionRow {
  id: string;
  user_id: string;
  type: string;
  montant: number;
  statut: string;
  provider: string | null;
  created_at: string;
  user_email?: string;
  book_titre?: string;
}

export interface AdminConfigRow {
  id: string;
  cle: string;
  valeur: string;
  description: string | null;
  modifie_le: string;
}

export interface AdminLogRow {
  id: string;
  admin_id: string;
  action: string;
  cible_type: string | null;
  cible_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
  admin_email?: string;
}

// ── Catégories du sondage ────────────────────────────────────

export const BOOK_CATEGORIES = [
  'Informatique & Cybersécurité',
  'Développement Personnel',
  'Littérature Africaine & Sénégalaise',
  'Économie & Business',
  'Dark Romance & Fiction',
  'Roman',
  'Aventure',
  'Mangas & Bandes Dessinées',
  'Droit & Sciences Politiques',
  'Sciences & Mathématiques',
  'Manuels Universitaires & Annales',
] as const;

// ── Hook : Stats globales ────────────────────────────────────

export function useAdminStats() {
  const [stats, setStats] = useState<AdminStats>({
    totalBooks: 0, totalUsers: 0, activeBorrows: 0,
    overdueBorrows: 0, activeSubscriptions: 0, revenueMonth: 0,
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [booksRes, usersRes, borrowsRes, overdueRes, subsRes, revenueRes] = await Promise.all([
        supabase.from('books').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('borrows').select('id', { count: 'exact', head: true }).eq('statut', 'actif'),
        supabase.from('borrows').select('id', { count: 'exact', head: true }).eq('statut', 'retard'),
        supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('statut', 'active'),
        supabase.from('transactions').select('montant').eq('statut', 'completed')
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      ]);

      const revenue = (revenueRes.data || []).reduce((sum: number, t: { montant: number }) => sum + t.montant, 0);

      setStats({
        totalBooks: booksRes.count || 0,
        totalUsers: usersRes.count || 0,
        activeBorrows: borrowsRes.count || 0,
        overdueBorrows: overdueRes.count || 0,
        activeSubscriptions: subsRes.count || 0,
        revenueMonth: revenue,
      });
    } catch (err) {
      console.error('Erreur chargement stats admin:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { stats, loading, refresh };
}

// ── Hook : Livres (CRUD) ─────────────────────────────────────

export function useAdminBooks() {
  const [books, setBooks] = useState<AdminBookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchBooks = useCallback(async (filters?: {
    search?: string;
    categorie?: string;
    status?: string;
    type?: string;
    page?: number;
    perPage?: number;
  }) => {
    setLoading(true);
    try {
      const page = filters?.page || 0;
      const perPage = filters?.perPage || 20;
      const from = page * perPage;
      const to = from + perPage - 1;

      let query = supabase
        .from('books')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filters?.search) {
        query = query.or(`titre.ilike.%${filters.search}%,auteur.ilike.%${filters.search}%`);
      }
      if (filters?.categorie) query = query.eq('categorie', filters.categorie);
      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.type) query = query.eq('type', filters.type);

      const { data, count, error } = await query;
      if (error) throw error;
      setBooks((data || []) as AdminBookRow[]);
      setTotal(count || 0);
    } catch (err) {
      console.error('Erreur chargement livres:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addBook = useCallback(async (book: Partial<AdminBookRow>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from('books').insert(book).select().single();
    if (error) throw error;
    return data;
  }, []);

  const updateBook = useCallback(async (id: string, updates: Partial<AdminBookRow>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('books').update(updates).eq('id', id);
    if (error) throw error;
  }, []);

  const deleteBook = useCallback(async (id: string) => {
    const { error } = await supabase.from('books').delete().eq('id', id);
    if (error) throw error;
  }, []);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  return { books, total, loading, fetchBooks, addBook, updateBook, deleteBook };
}

// ── Hook : Utilisateurs ──────────────────────────────────────

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchUsers = useCallback(async (filters?: {
    search?: string;
    plan?: string;
    role?: string;
    isActive?: boolean;
    page?: number;
    perPage?: number;
  }) => {
    setLoading(true);
    try {
      const page = filters?.page || 0;
      const perPage = filters?.perPage || 20;
      const from = page * perPage;
      const to = from + perPage - 1;

      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filters?.search) {
        query = query.or(`email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
      }
      if (filters?.plan) query = query.eq('plan', filters.plan);
      if (filters?.role) query = query.eq('role', filters.role);
      if (filters?.isActive !== undefined) query = query.eq('is_active', filters.isActive);

      const { data, count, error } = await query;
      if (error) throw error;
      setUsers((data || []) as AdminUserRow[]);
      setTotal(count || 0);
    } catch (err) {
      console.error('Erreur chargement utilisateurs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (id: string, updates: Partial<AdminUserRow>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('profiles').update(updates).eq('id', id);
    if (error) throw error;
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return { users, total, loading, fetchUsers, updateUser };
}

// ── Hook : Emprunts ──────────────────────────────────────────

export function useAdminBorrows() {
  const [borrows, setBorrows] = useState<AdminBorrowRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBorrows = useCallback(async (filters?: {
    statut?: string;
    page?: number;
    perPage?: number;
  }) => {
    setLoading(true);
    try {
      const page = filters?.page || 0;
      const perPage = filters?.perPage || 30;
      const from = page * perPage;
      const to = from + perPage - 1;

      let query = supabase
        .from('borrows')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filters?.statut) query = query.eq('statut', filters.statut);

      const { data, error } = await query;
      if (error) throw error;
      setBorrows((data || []) as AdminBorrowRow[]);
    } catch (err) {
      console.error('Erreur chargement emprunts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateBorrow = useCallback(async (id: string, updates: Partial<AdminBorrowRow>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('borrows').update(updates).eq('id', id);
    if (error) throw error;
  }, []);

  useEffect(() => { fetchBorrows(); }, [fetchBorrows]);

  return { borrows, loading, fetchBorrows, updateBorrow };
}

// ── Hook : Transactions ──────────────────────────────────────

export function useAdminTransactions() {
  const [transactions, setTransactions] = useState<AdminTransactionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async (filters?: {
    type?: string;
    statut?: string;
    page?: number;
    perPage?: number;
  }) => {
    setLoading(true);
    try {
      const page = filters?.page || 0;
      const perPage = filters?.perPage || 30;
      const from = page * perPage;
      const to = from + perPage - 1;

      let query = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filters?.type) query = query.eq('type', filters.type);
      if (filters?.statut) query = query.eq('statut', filters.statut);

      const { data, error } = await query;
      if (error) throw error;
      setTransactions((data || []) as AdminTransactionRow[]);
    } catch (err) {
      console.error('Erreur chargement transactions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  return { transactions, loading, fetchTransactions };
}

// ── Hook : Configuration plateforme ──────────────────────────

export function useAdminConfig() {
  const [config, setConfig] = useState<AdminConfigRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('platform_config')
        .select('*')
        .order('cle');
      if (error) throw error;
      setConfig((data || []) as AdminConfigRow[]);
    } catch (err) {
      console.error('Erreur chargement config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateConfig = useCallback(async (id: string, valeur: string, userId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('platform_config')
      .update({ valeur, modifie_par: userId, modifie_le: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  return { config, loading, fetchConfig, updateConfig };
}

// ── Hook : Journal d'audit ───────────────────────────────────

export function useAdminAudit() {
  const [logs, setLogs] = useState<AdminLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async (filters?: {
    action?: string;
    page?: number;
    perPage?: number;
  }) => {
    setLoading(true);
    try {
      const page = filters?.page || 0;
      const perPage = filters?.perPage || 50;
      const from = page * perPage;
      const to = from + perPage - 1;

      let query = supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filters?.action) query = query.eq('action', filters.action);

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data || []) as AdminLogRow[]);
    } catch (err) {
      console.error('Erreur chargement audit:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addLog = useCallback(async (log: {
    admin_id: string;
    action: string;
    cible_type?: string;
    cible_id?: string;
    details?: Record<string, unknown>;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('admin_logs').insert(log);
    if (error) throw error;
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return { logs, loading, fetchLogs, addLog };
}
