// ============================================================
// BiblioTech Admin — Gestion du Catalogue (Section A)
// CRUD livres, filtres, formulaire ajout
// ============================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Trash2, Edit3, Check, X, BookOpen, Upload, Library, Loader2 } from 'lucide-react';
import { useAdminBooks, BOOK_CATEGORIES, type AdminBookRow } from './hooks/useAdminData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface OlBook {
  key: string;
  title: string;
  authors?: string[];
  publishYear?: number;
  pages?: number;
  isbn?: string[];
  subjects?: string[];
  coverUrl?: string | null;
  publisher?: string;
}

// Appels NestJS — proxiés vers port 3002
import { nestSearchOpenLibrary as _nestSearch, nestGetByIsbn as _nestIsbn } from '@/services/nestApiService';

async function searchOpenLibrary(q: string): Promise<OlBook[]> {
  try {
    const result = await _nestSearch(q, 5);
    return result.books;
  } catch { return []; }
}

async function fetchByIsbn(isbn: string): Promise<OlBook | null> {
  try {
    return await _nestIsbn(isbn);
  } catch { return null; }
}

const MAX_BOOK_UPLOAD_BYTES = 1024 * 1024 * 1024;
const MAX_BOOK_UPLOAD_LABEL = '1 Go';

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'publie', label: 'Publié' },
  { value: 'brouillon', label: 'Brouillon' },
  { value: 'suspendu', label: 'Suspendu' },
  { value: 'archive', label: 'Archivé' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'Tous les types' },
  { value: 'gratuit', label: 'Gratuit' },
  { value: 'payant', label: 'Payant' },
  { value: 'premium', label: 'Premium' },
];

const statusColors: Record<string, string> = {
  publie: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  brouillon: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  suspendu: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  archive: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

export default function AdminCatalogue() {
  const { user } = useAuth();
  const { books, total, loading, fetchBooks, addBook, updateBook, deleteBook } = useAdminBooks();

  const [search, setSearch] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<'local' | 'online'>('local');
  const [selectedBookFile, setSelectedBookFile] = useState<File | null>(null);
  const [uploadingBookFile, setUploadingBookFile] = useState(false);

  // ── Open Library ──────────────────────────────────────────────
  const [olQuery, setOlQuery] = useState('');
  const [olResults, setOlResults] = useState<OlBook[]>([]);
  const [olLoading, setOlLoading] = useState(false);
  const [showOlPanel, setShowOlPanel] = useState(false);

  const handleOlSearch = async () => {
    const q = olQuery.trim() || `${newBook.titre} ${newBook.auteur}`.trim();
    if (!q) return;
    setOlLoading(true);
    const results = await searchOpenLibrary(q);
    setOlResults(results);
    setOlLoading(false);
  };

  const handleOlIsbnLookup = async () => {
    if (!newBook.isbn.trim()) return;
    setOlLoading(true);
    const book = await fetchByIsbn(newBook.isbn);
    if (book) applyOlBook(book);
    else notify('❌ ISBN introuvable sur Open Library');
    setOlLoading(false);
  };

  const applyOlBook = (book: OlBook) => {
    setNewBook(p => ({
      ...p,
      titre:       book.title || p.titre,
      auteur:      book.authors?.[0] || p.auteur,
      pages_count: book.pages || p.pages_count,
      isbn:        book.isbn?.[0] || p.isbn,
      editeur:     book.publisher || p.editeur,
      description: book.subjects?.join(', ') || p.description,
      cover_url:   book.coverUrl || p.cover_url,
    }));
    setShowOlPanel(false);
    notify(`✅ Métadonnées importées : "${book.title}"`);
  };

  const [newBook, setNewBook] = useState({
    titre: '', auteur: '', categorie: BOOK_CATEGORIES[0] as string, type: 'gratuit' as string,
    format: 'pdf' as string, prix_achat: 0, prix_location: 0, pages_count: 0,
    langue: 'fr', description: '', pdf_url: '', read_url: '', status: 'publie' as string,
    cover_url: '', isbn: '', editeur: '', type_acces: 'borrow_or_buy' as string, featured: false,
  });

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSearch = () => {
    fetchBooks({ search, categorie: filterCategorie, status: filterStatus, type: filterType });
  };

  const isAcceptedBookFile = (file: File) => {
    const name = file.name.toLowerCase();
    return file.type === 'application/pdf'
      || file.type === 'application/epub+zip'
      || name.endsWith('.pdf')
      || name.endsWith('.epub');
  };

  const handleBookFileChange = (file: File | null) => {
    if (!file) {
      setSelectedBookFile(null);
      return;
    }

    if (file.size > MAX_BOOK_UPLOAD_BYTES) {
      notify(`Fichier trop lourd : maximum ${MAX_BOOK_UPLOAD_LABEL} par livre`);
      setSelectedBookFile(null);
      return;
    }

    if (!isAcceptedBookFile(file)) {
      notify('Formats acceptes : PDF ou ePub');
      setSelectedBookFile(null);
      return;
    }

    setSelectedBookFile(file);
    setNewBook(p => ({
      ...p,
      format: file.name.toLowerCase().endsWith('.epub') ? 'epub' : 'pdf',
      pdf_url: '',
    }));
  };

  const uploadSelectedBookFile = async () => {
    if (uploadMode !== 'local') return newBook.pdf_url;
    if (!selectedBookFile) return '';

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Connexion admin requise.');

    const response = await fetch('/api/admin/books/upload-url', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: selectedBookFile.name,
        mimeType: selectedBookFile.type || (selectedBookFile.name.toLowerCase().endsWith('.epub') ? 'application/epub+zip' : 'application/pdf'),
        sizeBytes: selectedBookFile.size,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.message || 'Impossible de preparer l upload.');

    const { error } = await supabase.storage
      .from(payload.bucket)
      .uploadToSignedUrl(payload.path, payload.token, selectedBookFile, {
        contentType: selectedBookFile.type || 'application/pdf',
        cacheControl: '3600',
      });

    if (error) throw error;
    return payload.publicUrl as string;
  };

  const handleAdd = async () => {
    if (!newBook.titre || !newBook.auteur) { notify('❌ Titre et auteur requis'); return; }
    if (uploadMode === 'local' && !selectedBookFile) { notify('Choisis un fichier local PDF/ePub'); return; }
    if (uploadMode === 'online' && !newBook.pdf_url && !newBook.read_url) { notify('Ajoute une URL de fichier ou de lecture'); return; }
    try {
      setUploadingBookFile(Boolean(selectedBookFile));
      const uploadedPdfUrl = await uploadSelectedBookFile();
      const bookToCreate = { ...newBook, pdf_url: uploadedPdfUrl || newBook.pdf_url };
      await addBook({ ...bookToCreate, added_by: user?.id } as Partial<AdminBookRow>);
      setShowAdd(false);
      setNewBook({ titre: '', auteur: '', categorie: BOOK_CATEGORIES[0], type: 'gratuit', format: 'pdf', prix_achat: 0, prix_location: 0, pages_count: 0, langue: 'fr', description: '', pdf_url: '', read_url: '', status: 'publie', cover_url: '', isbn: '', editeur: '', type_acces: 'borrow_or_buy', featured: false });
      setUploadMode('local');
      setSelectedBookFile(null);
      fetchBooks();
      notify(`✅ "${newBook.titre}" ajouté au catalogue`);
    } catch (error) {
      notify(error instanceof Error ? `Erreur : ${error.message}` : '❌ Erreur lors de l\'ajout');
    } finally {
      setUploadingBookFile(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateBook(id, { status } as Partial<AdminBookRow>);
      fetchBooks();
      notify(`✅ Statut mis à jour`);
    } catch { notify('❌ Erreur'); }
  };

  const handleTypeChange = async (id: string, type: string) => {
    try {
      await updateBook(id, { type } as Partial<AdminBookRow>);
      fetchBooks();
      notify(`✅ Type mis à jour`);
    } catch { notify('❌ Erreur'); }
  };

  const handleCategoryChange = async (id: string, categorie: string) => {
    try {
      await updateBook(id, { categorie } as Partial<AdminBookRow>);
      fetchBooks();
      notify(`✅ Catégorie mise à jour`);
    } catch { notify('❌ Erreur'); }
  };

  const handlePriceChange = async (id: string, prix_achat: number) => {
    try {
      await updateBook(id, { prix_achat } as Partial<AdminBookRow>);
      fetchBooks();
      notify(`✅ Prix mis à jour`);
    } catch { notify('❌ Erreur'); }
  };

  const handleDelete = async (id: string, titre: string) => {
    if (!confirm(`Supprimer "${titre}" définitivement ?`)) return;
    try {
      await deleteBook(id);
      fetchBooks();
      notify(`🗑️ "${titre}" supprimé`);
    } catch { notify('❌ Erreur suppression'); }
  };

  const inp = "px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="space-y-4">
      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="px-4 py-2.5 rounded-lg bg-card border border-border text-sm font-medium text-foreground">
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barre de recherche + filtres */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Rechercher titre, auteur..." className={`${inp} w-full pl-9`} />
        </div>
        <select value={filterCategorie} onChange={e => setFilterCategorie(e.target.value)} className={inp}>
          <option value="">Toutes catégories</option>
          {BOOK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={inp}>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className={inp}>
          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <button onClick={handleSearch} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
          Filtrer
        </button>
        <button onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {/* Formulaire ajout */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="bg-card border border-primary/30 rounded-xl p-5 space-y-3 overflow-hidden">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" /> Nouveau livre
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input placeholder="Titre *" value={newBook.titre} onChange={e => setNewBook(p => ({ ...p, titre: e.target.value }))} className={`${inp} col-span-full`} />
              <input placeholder="Auteur *" value={newBook.auteur} onChange={e => setNewBook(p => ({ ...p, auteur: e.target.value }))} className={inp} />
              <select value={newBook.categorie} onChange={e => setNewBook(p => ({ ...p, categorie: e.target.value }))} className={inp}>
                {BOOK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={newBook.type} onChange={e => setNewBook(p => ({ ...p, type: e.target.value }))} className={inp}>
                <option value="gratuit">Gratuit</option>
                <option value="payant">Payant</option>
                <option value="premium">Premium</option>
              </select>
              <select value={newBook.format} onChange={e => setNewBook(p => ({ ...p, format: e.target.value }))} className={inp}>
                <option value="pdf">PDF</option>
                <option value="epub">ePub</option>
                <option value="pdf_epub">PDF + ePub</option>
              </select>
              <input type="number" placeholder="Prix achat (FCFA)" value={newBook.prix_achat || ''} onChange={e => setNewBook(p => ({ ...p, prix_achat: +e.target.value }))} className={inp} />
              <input type="number" placeholder="Prix location (FCFA)" value={newBook.prix_location || ''} onChange={e => setNewBook(p => ({ ...p, prix_location: +e.target.value }))} className={inp} />
              <input type="number" placeholder="Nombre de pages" value={newBook.pages_count || ''} onChange={e => setNewBook(p => ({ ...p, pages_count: +e.target.value }))} className={inp} />
              <div className="col-span-full grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted/30 p-1">
                <button
                  type="button"
                  onClick={() => { setUploadMode('local'); setNewBook(p => ({ ...p, pdf_url: '', read_url: '' })); }}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${uploadMode === 'local' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Fichier local
                </button>
                <button
                  type="button"
                  onClick={() => { setUploadMode('online'); setSelectedBookFile(null); }}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${uploadMode === 'online' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Lien en ligne
                </button>
              </div>
              {uploadMode === 'local' && (
              <label className={`${inp} col-span-full cursor-pointer flex flex-col gap-1`}>
                <span className="text-xs font-semibold text-muted-foreground">Fichier local PDF/ePub, max {MAX_BOOK_UPLOAD_LABEL}</span>
                <input
                  type="file"
                  accept="application/pdf,application/epub+zip,.pdf,.epub"
                  onChange={e => handleBookFileChange(e.target.files?.[0] || null)}
                  className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground file:font-medium"
                />
                {selectedBookFile && (
                  <span className="text-xs text-primary">
                    {selectedBookFile.name} - {(selectedBookFile.size / (1024 * 1024)).toFixed(1)} Mo
                  </span>
                )}
              </label>
              )}
              {uploadMode === 'online' && (
              <>
              <input placeholder="URL PDF / ePub" value={newBook.pdf_url} onChange={e => setNewBook(p => ({ ...p, pdf_url: e.target.value }))} className={`${inp} col-span-full`} />
              <input placeholder="URL de lecture intégrée (read_url)" value={newBook.read_url} onChange={e => setNewBook(p => ({ ...p, read_url: e.target.value }))} className={`${inp} col-span-full`} />
              </>
              )}
              <textarea placeholder="Description..." value={newBook.description} onChange={e => setNewBook(p => ({ ...p, description: e.target.value }))} className={`${inp} col-span-full`} rows={2} />

              {/* ── Open Library ──────────────────────────────── */}
              <div className="col-span-full">
                <button
                  type="button"
                  onClick={() => setShowOlPanel(v => !v)}
                  className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-primary/30 bg-primary/5 text-primary font-medium hover:bg-primary/10 transition-colors"
                >
                  <Library className="w-3.5 h-3.5" />
                  Importer depuis Open Library
                </button>

                <AnimatePresence>
                  {showOlPanel && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 space-y-2 overflow-hidden"
                    >
                      <div className="flex gap-2">
                        <input
                          placeholder="Titre ou auteur à rechercher..."
                          value={olQuery}
                          onChange={e => setOlQuery(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleOlSearch()}
                          className={`${inp} flex-1`}
                        />
                        <button
                          type="button"
                          onClick={handleOlSearch}
                          disabled={olLoading}
                          className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 flex items-center gap-1.5"
                        >
                          {olLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                          Chercher
                        </button>
                      </div>

                      {olResults.length > 0 && (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {olResults.map(book => (
                            <button
                              key={book.key}
                              type="button"
                              onClick={() => applyOlBook(book)}
                              className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-background hover:border-primary/40 hover:bg-primary/5 transition-colors"
                            >
                              {book.coverUrl ? (
                                <img src={book.coverUrl} alt="" className="w-8 h-10 object-cover rounded flex-shrink-0" loading="lazy" />
                              ) : (
                                <div className="w-8 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0 text-sm">📚</div>
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{book.title}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {book.authors?.join(', ')}
                                  {book.publishYear ? ` · ${book.publishYear}` : ''}
                                  {book.pages ? ` · ${book.pages}p` : ''}
                                </p>
                              </div>
                              <span className="ml-auto text-[10px] text-primary font-medium flex-shrink-0">Utiliser →</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Champs supplémentaires */}
              <input placeholder="URL couverture (image)" value={newBook.cover_url} onChange={e => setNewBook(p => ({ ...p, cover_url: e.target.value }))} className={`${inp} col-span-full`} />
              <div className="flex gap-2">
                <input
                  placeholder="ISBN (ex: 978-2-...)"
                  value={newBook.isbn}
                  onChange={e => setNewBook(p => ({ ...p, isbn: e.target.value }))}
                  className={`${inp} flex-1`}
                />
                <button
                  type="button"
                  onClick={handleOlIsbnLookup}
                  disabled={olLoading || !newBook.isbn.trim()}
                  title="Remplir depuis Open Library via ISBN"
                  className="px-3 py-2 rounded-lg border border-border bg-background text-xs text-muted-foreground hover:text-primary hover:border-primary/40 disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  {olLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Library className="w-3 h-3" />}
                  Auto-fill
                </button>
              </div>
              <input placeholder="Éditeur" value={newBook.editeur} onChange={e => setNewBook(p => ({ ...p, editeur: e.target.value }))} className={inp} />
              <select value={newBook.type_acces} onChange={e => setNewBook(p => ({ ...p, type_acces: e.target.value }))} className={inp}>
                <option value="free">Gratuit (accès libre)</option>
                <option value="borrow_only">Emprunt uniquement</option>
                <option value="buy_only">Achat uniquement</option>
                <option value="borrow_or_buy">Emprunt ou achat</option>
                <option value="premium">Premium (abonnement)</option>
              </select>
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background cursor-pointer">
                <input type="checkbox" checked={newBook.featured} onChange={e => setNewBook(p => ({ ...p, featured: e.target.checked }))} className="accent-primary" />
                <span className="text-sm text-foreground">Mettre en avant (featured)</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={uploadingBookFile} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed">
                <Check className="w-4 h-4" /> {uploadingBookFile ? 'Upload en cours...' : 'Confirmer'}
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted">
                Annuler
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compteur */}
      <p className="text-xs text-muted-foreground">{total} livre(s) au total</p>

      {/* Liste des livres */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Aucun livre dans le catalogue</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {books.map(book => (
            <motion.div key={book.id} layout
              className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3 hover:border-primary/30 transition-colors">
              {/* Couverture */}
              <div className="w-10 h-14 rounded bg-muted flex items-center justify-center text-lg flex-shrink-0 overflow-hidden">
                {book.cover_url ? (
                  <img src={book.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                ) : '📚'}
              </div>
              {/* Infos */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{book.titre}</p>
                <p className="text-xs text-muted-foreground">
                  {book.auteur}
                  {book.prix_achat > 0 && <> · <span className="text-amber-600 font-medium">{book.prix_achat.toLocaleString('fr-FR')} F</span></>}
                </p>
              </div>
              {/* Badges */}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[book.status] || 'bg-gray-100 text-gray-600'}`}>
                {book.status}
              </span>
              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                <select
                  value={book.categorie}
                  onChange={e => handleCategoryChange(book.id, e.target.value)}
                  className="text-xs px-2 py-1 rounded border border-border bg-background text-primary font-medium w-28"
                >
                  {BOOK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select
                  value={book.type}
                  onChange={e => handleTypeChange(book.id, e.target.value)}
                  className="text-xs px-2 py-1 rounded border border-border bg-background text-foreground"
                >
                  <option value="gratuit">Gratuit</option>
                  <option value="payant">Payant</option>
                  <option value="premium">Premium</option>
                </select>

                {book.type === 'payant' && (
                  <div className="flex items-center gap-1">
                    <input 
                      type="number" 
                      defaultValue={book.prix_achat} 
                      onBlur={e => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val !== book.prix_achat) {
                          handlePriceChange(book.id, val);
                        }
                      }}
                      className="text-xs px-2 py-1 rounded border border-border bg-background text-foreground w-20"
                      placeholder="Prix (F)"
                    />
                    <span className="text-xs text-muted-foreground">F</span>
                  </div>
                )}

                <select
                  value={book.status}
                  onChange={e => handleStatusChange(book.id, e.target.value)}
                  className="text-xs px-2 py-1 rounded border border-border bg-background text-foreground"
                >
                  <option value="publie">Publier</option>
                  <option value="suspendu">Suspendre</option>
                  <option value="archive">Archiver</option>
                  <option value="brouillon">Brouillon</option>
                </select>
                <button onClick={() => handleDelete(book.id, book.titre)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
