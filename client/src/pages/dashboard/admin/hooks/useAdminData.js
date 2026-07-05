// ============================================================
// BiblioTech — Hooks Admin (requêtes Supabase)
// Centralise toutes les opérations admin sur la base de données
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
// ── Catégories du sondage ────────────────────────────────────
export const BOOK_CATEGORIES = [
    'Informatique & Cybersécurité',
    'Développement Personnel',
    'Littérature Africaine & Sénégalaise',
    'Économie & Business',
    'Dark Romance & Fiction',
    'Aventure',
    'Mangas & Bandes Dessinées',
    'Droit & Sciences Politiques',
    'Sciences & Mathématiques',
    'Manuels Universitaires & Annales',
];
// ── Hook : Stats globales ────────────────────────────────────
export function useAdminStats() {
    const [stats, setStats] = useState({
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
            const revenue = (revenueRes.data || []).reduce((sum, t) => sum + t.montant, 0);
            setStats({
                totalBooks: booksRes.count || 0,
                totalUsers: usersRes.count || 0,
                activeBorrows: borrowsRes.count || 0,
                overdueBorrows: overdueRes.count || 0,
                activeSubscriptions: subsRes.count || 0,
                revenueMonth: revenue,
            });
        }
        catch (err) {
            console.error('Erreur chargement stats admin:', err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { refresh(); }, [refresh]);
    return { stats, loading, refresh };
}
// ── Hook : Livres (CRUD) ─────────────────────────────────────
export function useAdminBooks() {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const fetchBooks = useCallback(async (filters) => {
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
            if (filters?.categorie)
                query = query.eq('categorie', filters.categorie);
            if (filters?.status)
                query = query.eq('status', filters.status);
            if (filters?.type)
                query = query.eq('type', filters.type);
            const { data, count, error } = await query;
            if (error)
                throw error;
            setBooks((data || []));
            setTotal(count || 0);
        }
        catch (err) {
            console.error('Erreur chargement livres:', err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    const addBook = useCallback(async (book) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await supabase.from('books').insert(book).select().single();
        if (error)
            throw error;
        return data;
    }, []);
    const updateBook = useCallback(async (id, updates) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from('books').update(updates).eq('id', id);
        if (error)
            throw error;
    }, []);
    const deleteBook = useCallback(async (id) => {
        const { error } = await supabase.from('books').delete().eq('id', id);
        if (error)
            throw error;
    }, []);
    useEffect(() => { fetchBooks(); }, [fetchBooks]);
    return { books, total, loading, fetchBooks, addBook, updateBook, deleteBook };
}
// ── Hook : Utilisateurs ──────────────────────────────────────
export function useAdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const fetchUsers = useCallback(async (filters) => {
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
            if (filters?.plan)
                query = query.eq('plan', filters.plan);
            if (filters?.role)
                query = query.eq('role', filters.role);
            if (filters?.isActive !== undefined)
                query = query.eq('is_active', filters.isActive);
            const { data, count, error } = await query;
            if (error)
                throw error;
            setUsers((data || []));
            setTotal(count || 0);
        }
        catch (err) {
            console.error('Erreur chargement utilisateurs:', err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    const updateUser = useCallback(async (id, updates) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from('profiles').update(updates).eq('id', id);
        if (error)
            throw error;
    }, []);
    useEffect(() => { fetchUsers(); }, [fetchUsers]);
    return { users, total, loading, fetchUsers, updateUser };
}
// ── Hook : Emprunts ──────────────────────────────────────────
export function useAdminBorrows() {
    const [borrows, setBorrows] = useState([]);
    const [loading, setLoading] = useState(true);
    const fetchBorrows = useCallback(async (filters) => {
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
            if (filters?.statut)
                query = query.eq('statut', filters.statut);
            const { data, error } = await query;
            if (error)
                throw error;
            setBorrows((data || []));
        }
        catch (err) {
            console.error('Erreur chargement emprunts:', err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    const updateBorrow = useCallback(async (id, updates) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from('borrows').update(updates).eq('id', id);
        if (error)
            throw error;
    }, []);
    useEffect(() => { fetchBorrows(); }, [fetchBorrows]);
    return { borrows, loading, fetchBorrows, updateBorrow };
}
// ── Hook : Transactions ──────────────────────────────────────
export function useAdminTransactions() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const fetchTransactions = useCallback(async (filters) => {
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
            if (filters?.type)
                query = query.eq('type', filters.type);
            if (filters?.statut)
                query = query.eq('statut', filters.statut);
            const { data, error } = await query;
            if (error)
                throw error;
            setTransactions((data || []));
        }
        catch (err) {
            console.error('Erreur chargement transactions:', err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { fetchTransactions(); }, [fetchTransactions]);
    return { transactions, loading, fetchTransactions };
}
// ── Hook : Configuration plateforme ──────────────────────────
export function useAdminConfig() {
    const [config, setConfig] = useState([]);
    const [loading, setLoading] = useState(true);
    const fetchConfig = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('platform_config')
                .select('*')
                .order('cle');
            if (error)
                throw error;
            setConfig((data || []));
        }
        catch (err) {
            console.error('Erreur chargement config:', err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    const updateConfig = useCallback(async (id, valeur, userId) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase
            .from('platform_config')
            .update({ valeur, modifie_par: userId, modifie_le: new Date().toISOString() })
            .eq('id', id);
        if (error)
            throw error;
    }, []);
    useEffect(() => { fetchConfig(); }, [fetchConfig]);
    return { config, loading, fetchConfig, updateConfig };
}
// ── Hook : Journal d'audit ───────────────────────────────────
export function useAdminAudit() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const fetchLogs = useCallback(async (filters) => {
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
            if (filters?.action)
                query = query.eq('action', filters.action);
            const { data, error } = await query;
            if (error)
                throw error;
            setLogs((data || []));
        }
        catch (err) {
            console.error('Erreur chargement audit:', err);
        }
        finally {
            setLoading(false);
        }
    }, []);
    const addLog = useCallback(async (log) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase.from('admin_logs').insert(log);
        if (error)
            throw error;
    }, []);
    useEffect(() => { fetchLogs(); }, [fetchLogs]);
    return { logs, loading, fetchLogs, addLog };
}
