import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, TrendingUp, Wallet, Users, Plus, Loader2, Check,
  Clock, CheckCircle2, XCircle, Upload, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  getAuthorDashboard, submitAuthorBook, requestWithdrawal,
  fileToDataUrl, type AuthorDashboardData
} from '@/services/authorService';

const BOOK_CATEGORIES = [
  'Informatique & Cybersécurité', 'Développement Personnel', 'Littérature Africaine & Sénégalaise',
  'Économie & Business', 'Dark Romance & Fiction', 'Roman', 'Aventure',
  'Mangas & Bandes Dessinées', 'Droit & Sciences Politiques', 'Sciences & Mathématiques',
  'Manuels Universitaires & Annales',
];

const MAX_FILE_BYTES = 40 * 1024 * 1024;

const STATUS_LABEL: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  publie:    { label: 'Publié',    color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',  icon: CheckCircle2 },
  brouillon: { label: 'En attente', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
  suspendu:  { label: 'Suspendu', color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',          icon: XCircle },
  archive:   { label: 'Archivé',  color: 'text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400',         icon: XCircle },
};

function StatCard({ icon: Icon, label, value, sub, color = 'text-primary' }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function AuthorDashboard() {
  const [data, setData] = useState<AuthorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Submit book form
  const [showBookForm, setShowBookForm] = useState(false);
  const [bookFile, setBookFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [bookForm, setBookForm] = useState({
    titre: '', auteur: '', categorie: BOOK_CATEGORIES[0], description: '', extract: '',
    prix_achat: '', prix_location: '',
  });
  const [submittingBook, setSubmittingBook] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);
  const [bookSuccess, setBookSuccess] = useState(false);

  // Withdrawal form
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawWave, setWithdrawWave] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getAuthorDashboard();
      if (!d) { setError('Espace auteur non activé.'); return; }
      setData(d);
      setWithdrawWave(d.author.wave_number || '');
    } catch { setError('Impossible de charger le dashboard.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForm.titre || !bookForm.categorie) { setBookError('Titre et catégorie obligatoires.'); return; }
    if (!bookFile) { setBookError('Le fichier PDF ou ePub est obligatoire.'); return; }
    if (bookFile.size > MAX_FILE_BYTES) { setBookError('Fichier trop lourd (max 40 Mo).'); return; }

    setSubmittingBook(true);
    setBookError(null);
    try {
      const fileDataUrl = await fileToDataUrl(bookFile);
      const coverDataUrl = coverFile ? await fileToDataUrl(coverFile) : null;
      await submitAuthorBook({
        ...bookForm,
        auteur: bookForm.auteur || (data?.author.nom_plume ?? ''),
        prix_achat: Number(bookForm.prix_achat) || 0,
        prix_location: Number(bookForm.prix_location) || 0,
        file: { dataUrl: fileDataUrl, filename: bookFile.name },
        cover: coverDataUrl ? { dataUrl: coverDataUrl, filename: coverFile!.name } : null,
      });
      setBookSuccess(true);
      setShowBookForm(false);
      setBookFile(null); setCoverFile(null);
      setBookForm({ titre: '', auteur: '', categorie: BOOK_CATEGORIES[0], description: '', extract: '', prix_achat: '', prix_location: '' });
      await load();
    } catch (err) {
      setBookError(err instanceof Error ? err.message : 'Erreur envoi.');
    } finally { setSubmittingBook(false); }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(withdrawAmount);
    if (!amount || amount < 1000) { setWithdrawError('Minimum 1 000 FCFA.'); return; }
    if (!withdrawWave.trim()) { setWithdrawError('Numéro Wave obligatoire.'); return; }
    setWithdrawing(true);
    setWithdrawError(null);
    try {
      await requestWithdrawal(amount, withdrawWave);
      setWithdrawSuccess(true);
      setShowWithdraw(false);
      await load();
    } catch (err) {
      setWithdrawError(err instanceof Error ? err.message : 'Erreur retrait.');
    } finally { setWithdrawing(false); }
  };

  const inp = 'w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30';

  if (loading) return (
    <DashboardLayout>
      <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto text-center py-20">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
        <p className="text-foreground font-semibold">{error}</p>
      </div>
    </DashboardLayout>
  );

  const { author, stats, balance, recentBooks } = data!;

  return (
    <DashboardLayout>
      <motion.div className="space-y-6 max-w-4xl mx-auto" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{author.nom_plume}</h1>
            <p className="text-sm text-muted-foreground">
              Espace auteur · {author.verified ? '✓ Vérifié' : 'Non vérifié'}
              {author.statut === 'pending' && ' · En attente de validation'}
            </p>
          </div>
          <button
            onClick={() => { setShowBookForm(v => !v); setBookSuccess(false); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Soumettre un livre
          </button>
        </div>

        {author.statut === 'pending' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-4 flex items-center gap-3 text-sm text-amber-700 dark:text-amber-400">
            <Clock className="w-4 h-4 flex-shrink-0" />
            Ton profil est en attente de validation admin. Tu peux déjà soumettre des livres — ils seront publiés après approbation.
          </div>
        )}

        {bookSuccess && (
          <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 p-4 flex items-center gap-3 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Livre soumis avec succès ! Il sera publié après validation par notre équipe.
          </div>
        )}

        {withdrawSuccess && (
          <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 p-4 flex items-center gap-3 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Demande de retrait envoyée ! Le virement Wave sera effectué sous 24–48h.
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={BookOpen} label="Livres publiés" value={stats.publishedBooks} sub={`${stats.pendingBooks} en attente`} />
          <StatCard icon={TrendingUp} label="Ventes" value={stats.sales} color="text-emerald-600" />
          <StatCard icon={Users} label="Lecteurs actifs" value={stats.activeReaders} color="text-blue-600" />
          <StatCard icon={Wallet} label="Revenus totaux" value={`${stats.revenueFcfa.toLocaleString('fr-FR')} F`} color="text-purple-600" />
        </div>

        {/* Solde + retrait */}
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Solde disponible</p>
              <p className="text-3xl font-bold text-foreground">{balance.availableFcfa.toLocaleString('fr-FR')} <span className="text-lg font-medium">FCFA</span></p>
              <p className="text-xs text-muted-foreground mt-1">Minimum de retrait : {balance.minimumFcfa.toLocaleString('fr-FR')} FCFA</p>
            </div>
            <button
              onClick={() => { setShowWithdraw(v => !v); setWithdrawSuccess(false); }}
              disabled={!balance.canWithdraw}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Wallet className="w-4 h-4" />
              Retirer via Wave
            </button>
          </div>

          <AnimatePresence>
            {showWithdraw && (
              <motion.form
                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
                onSubmit={handleWithdraw}
              >
                <div className="border-t border-primary/20 mt-4 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="number" placeholder="Montant (FCFA)" min={1000} max={balance.availableFcfa}
                    value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                    className={inp} required
                  />
                  <input
                    placeholder="Numéro Wave" value={withdrawWave}
                    onChange={e => setWithdrawWave(e.target.value)}
                    className={inp} required
                  />
                  <button type="submit" disabled={withdrawing}
                    className="py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2">
                    {withdrawing ? <><Loader2 className="w-4 h-4 animate-spin" /> Traitement...</> : 'Confirmer le retrait'}
                  </button>
                  {withdrawError && <p className="text-xs text-red-500 col-span-full">{withdrawError}</p>}
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* Formulaire soumission livre */}
        <AnimatePresence>
          {showBookForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleBookSubmit} className="bg-card border border-primary/30 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Soumettre un nouveau livre</h3>
                  <button type="button" onClick={() => setShowBookForm(false)} className="p-1 rounded-lg hover:bg-muted">
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input placeholder="Titre *" value={bookForm.titre} onChange={e => setBookForm(p => ({ ...p, titre: e.target.value }))} className={`${inp} col-span-full`} required />
                  <input placeholder={`Auteur (défaut: ${author.nom_plume})`} value={bookForm.auteur} onChange={e => setBookForm(p => ({ ...p, auteur: e.target.value }))} className={inp} />
                  <select value={bookForm.categorie} onChange={e => setBookForm(p => ({ ...p, categorie: e.target.value }))} className={inp}>
                    {BOOK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="number" placeholder="Prix d'achat (FCFA)" min={0} value={bookForm.prix_achat} onChange={e => setBookForm(p => ({ ...p, prix_achat: e.target.value }))} className={inp} />
                  <input type="number" placeholder="Prix de location (FCFA)" min={0} value={bookForm.prix_location} onChange={e => setBookForm(p => ({ ...p, prix_location: e.target.value }))} className={inp} />
                  <textarea placeholder="Description..." rows={3} value={bookForm.description} onChange={e => setBookForm(p => ({ ...p, description: e.target.value }))} className={`${inp} col-span-full resize-none`} />
                  <textarea placeholder="Extrait (quelques pages pour donner envie...)" rows={4} value={bookForm.extract} onChange={e => setBookForm(p => ({ ...p, extract: e.target.value }))} className={`${inp} col-span-full resize-none`} />

                  {/* Fichier livre */}
                  <label className={`${inp} col-span-full cursor-pointer flex items-center gap-3`}>
                    <Upload className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{bookFile ? `${bookFile.name} (${(bookFile.size / (1024 * 1024)).toFixed(1)} Mo)` : 'Fichier PDF ou ePub * (max 40 Mo)'}</span>
                    <input type="file" accept="application/pdf,application/epub+zip,.pdf,.epub" onChange={e => setBookFile(e.target.files?.[0] || null)} className="hidden" />
                  </label>

                  {/* Couverture */}
                  <label className={`${inp} col-span-full cursor-pointer flex items-center gap-3`}>
                    <Upload className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{coverFile ? coverFile.name : 'Image de couverture (JPG, PNG, WebP — optionnel)'}</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={e => setCoverFile(e.target.files?.[0] || null)} className="hidden" />
                  </label>
                </div>

                <p className="text-xs text-muted-foreground">Prix recommandé : 2 000 – 3 000 FCFA. Tu recevras 70% de chaque vente.</p>

                {bookError && <p className="text-sm text-red-500">{bookError}</p>}

                <div className="flex gap-3">
                  <button type="submit" disabled={submittingBook}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-60">
                    {submittingBook ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</> : <><Check className="w-4 h-4" /> Soumettre pour validation</>}
                  </button>
                  <button type="button" onClick={() => setShowBookForm(false)} className="px-4 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted">Annuler</button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Liste des livres */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-foreground">Mes livres ({recentBooks.length})</h2>
          {recentBooks.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-xl">
              <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Aucun livre soumis pour le moment.</p>
              <button onClick={() => setShowBookForm(true)} className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90">
                Soumettre mon premier livre
              </button>
            </div>
          ) : (
            recentBooks.map(book => {
              const s = STATUS_LABEL[book.status] || STATUS_LABEL.brouillon;
              const Icon = s.icon;
              return (
                <div key={book.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{book.titre}</p>
                    <p className="text-xs text-muted-foreground">
                      {book.prix_achat > 0 ? `${book.prix_achat.toLocaleString('fr-FR')} F achat` : 'Gratuit'}
                      {book.prix_location > 0 && ` · ${book.prix_location.toLocaleString('fr-FR')} F location`}
                      {' · '}{new Date(book.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 ${s.color}`}>
                    <Icon className="w-3 h-3" /> {s.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
