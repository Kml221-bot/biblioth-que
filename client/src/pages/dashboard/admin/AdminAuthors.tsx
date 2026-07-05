import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Clock, BookOpen, User, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface AuthorProfileRow {
  id: string;
  user_id: string;
  nom_plume: string;
  bio: string | null;
  wave_number: string | null;
  statut: string;
  verified: boolean;
  solde_disponible: number;
  created_at: string;
  identity_document_url: string | null;
  rejection_reason: string | null;
  profiles?: { email: string; first_name: string; last_name: string } | null;
}

interface PendingBook {
  id: string;
  titre: string;
  auteur: string;
  categorie: string;
  prix_achat: number;
  status: string;
  pdf_url: string | null;
  cover_url: string | null;
  created_at: string;
  author_profile_id: string | null;
  author_name?: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  suspended:'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default function AdminAuthors() {
  const [authors, setAuthors] = useState<AuthorProfileRow[]>([]);
  const [pendingBooks, setPendingBooks] = useState<PendingBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'authors' | 'books'>('authors');

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Charger les profils auteurs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: authorData } = await (supabase as any)
        .from('author_profiles')
        .select('*, profiles:user_id(email,first_name,last_name)')
        .order('created_at', { ascending: false });

      setAuthors(authorData || []);

      // Livres en attente de publication (brouillon avec author_profile_id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: bookData } = await (supabase as any)
        .from('books')
        .select('id,titre,auteur,categorie,prix_achat,status,pdf_url,cover_url,created_at,author_profile_id')
        .eq('status', 'brouillon')
        .not('author_profile_id', 'is', null)
        .order('created_at', { ascending: false });

      // Enrichir avec le nom de plume
      const booksWithAuthor: PendingBook[] = await Promise.all(
        (bookData || []).map(async (book: PendingBook) => {
          if (!book.author_profile_id) return book;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: ap } = await (supabase as any)
            .from('author_profiles')
            .select('nom_plume')
            .eq('id', book.author_profile_id)
            .single();
          return { ...book, author_name: ap?.nom_plume || book.auteur };
        })
      );
      setPendingBooks(booksWithAuthor);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateAuthorStatus = async (authorId: string, statut: string, reason?: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('author_profiles')
      .update({ statut, rejection_reason: reason || null, reviewed_at: new Date().toISOString() })
      .eq('id', authorId);
    if (error) { notify(`❌ Erreur : ${error.message}`); return; }
    notify(statut === 'approved' ? '✅ Auteur approuvé' : '❌ Auteur refusé');
    await load();
  };

  const updateBookStatus = async (bookId: string, status: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('books')
      .update({ status })
      .eq('id', bookId);
    if (error) { notify(`❌ Erreur : ${error.message}`); return; }
    notify(status === 'publie' ? '✅ Livre publié' : '🗑️ Livre archivé');
    await load();
  };

  const pendingAuthors = authors.filter(a => a.statut === 'pending');
  const otherAuthors  = authors.filter(a => a.statut !== 'pending');

  return (
    <div className="space-y-4">
      {/* Notification */}
      {notification && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="px-4 py-2.5 rounded-lg bg-card border border-border text-sm font-medium text-foreground">
          {notification}
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          onClick={() => setActiveTab('authors')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'authors' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Auteurs {pendingAuthors.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold">{pendingAuthors.length}</span>}
        </button>
        <button
          onClick={() => setActiveTab('books')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'books' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          Livres à valider {pendingBooks.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px] font-bold">{pendingBooks.length}</span>}
        </button>
        <button onClick={load} className="ml-auto p-2 rounded-lg hover:bg-muted transition-colors">
          <RefreshCw className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : activeTab === 'authors' ? (
        <div className="space-y-4">
          {/* Pending authors */}
          {pendingAuthors.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <Clock className="w-4 h-4" /> En attente ({pendingAuthors.length})
              </h3>
              {pendingAuthors.map(author => {
                const profile = Array.isArray(author.profiles) ? author.profiles[0] : author.profiles;
                return (
                  <div key={author.id} className="bg-card border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{author.nom_plume}</p>
                          <p className="text-xs text-muted-foreground">{profile?.email || author.user_id}</p>
                          {author.bio && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{author.bio}</p>}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(author.created_at).toLocaleDateString('fr-FR')}
                        {author.wave_number && <p className="text-primary mt-0.5">Wave: {author.wave_number}</p>}
                      </div>
                    </div>
                    {author.identity_document_url && (
                      <a href={author.identity_document_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-primary underline">Voir pièce d'identité</a>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => updateAuthorStatus(author.id, 'approved')}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approuver
                      </button>
                      <input
                        placeholder="Raison du refus (optionnel)"
                        value={rejectReason[author.id] || ''}
                        onChange={e => setRejectReason(p => ({ ...p, [author.id]: e.target.value }))}
                        className="flex-1 min-w-[160px] px-2.5 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-red-300"
                      />
                      <button onClick={() => updateAuthorStatus(author.id, 'rejected', rejectReason[author.id])}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600">
                        <XCircle className="w-3.5 h-3.5" /> Refuser
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* All authors */}
          {otherAuthors.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Tous les auteurs ({otherAuthors.length})</h3>
              {otherAuthors.map(author => {
                const profile = Array.isArray(author.profiles) ? author.profiles[0] : author.profiles;
                return (
                  <div key={author.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                    <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{author.nom_plume}</p>
                      <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">{author.solde_disponible.toLocaleString('fr-FR')} F</p>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[author.statut] || STATUS_COLORS.pending}`}>
                      {author.statut}
                    </span>
                    {author.statut === 'approved' && (
                      <button onClick={() => updateAuthorStatus(author.id, 'suspended')}
                        className="text-xs px-2 py-1 border border-border rounded-lg text-muted-foreground hover:text-red-500 hover:border-red-300 transition-colors">
                        Suspendre
                      </button>
                    )}
                    {author.statut === 'suspended' && (
                      <button onClick={() => updateAuthorStatus(author.id, 'approved')}
                        className="text-xs px-2 py-1 border border-green-300 rounded-lg text-green-600 hover:bg-green-50 transition-colors">
                        Réactiver
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {authors.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">Aucun auteur inscrit pour le moment.</div>
          )}
        </div>
      ) : (
        /* Livres en attente */
        <div className="space-y-2">
          {pendingBooks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Aucun livre en attente de validation.</div>
          ) : pendingBooks.map(book => (
            <div key={book.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
              {book.cover_url ? (
                <img src={book.cover_url} alt="" className="w-10 h-14 object-cover rounded-lg flex-shrink-0" />
              ) : (
                <div className="w-10 h-14 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{book.titre}</p>
                <p className="text-xs text-muted-foreground">
                  par <span className="text-primary">{book.author_name || book.auteur}</span>
                  {' · '}{book.categorie}
                  {book.prix_achat > 0 && ` · ${book.prix_achat.toLocaleString('fr-FR')} F`}
                </p>
                <p className="text-xs text-muted-foreground">{new Date(book.created_at).toLocaleDateString('fr-FR')}</p>
              </div>
              {book.pdf_url && (
                <a href={book.pdf_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary underline whitespace-nowrap">Lire</a>
              )}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => updateBookStatus(book.id, 'publie')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Publier
                </button>
                <button onClick={() => updateBookStatus(book.id, 'archive')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600">
                  <XCircle className="w-3.5 h-3.5" /> Refuser
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
