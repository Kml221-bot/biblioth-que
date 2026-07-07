import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { PenLine, Upload, Clock, CheckCircle2, XCircle, Loader2, BookOpen, TrendingUp, Wallet } from 'lucide-react';
import { useLocation } from 'wouter';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { getAuthorDashboard, registerAsAuthor, fileToDataUrl } from '@/services/authorService';

const CATEGORIES = [
  'Informatique & Cybersécurité', 'Développement Personnel', 'Littérature Africaine & Sénégalaise',
  'Économie & Business', 'Dark Romance & Fiction', 'Roman', 'Aventure',
  'Manga & BD', 'Droit & Sciences Politiques', 'Sciences & Mathématiques',
  'Manuels Universitaires & Annales',
];

export default function AuthorSpace() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<string | null>(null); // null = not registered

  // Form state
  const [nomPlume, setNomPlume] = useState('');
  const [bio, setBio] = useState('');
  const [waveNumber, setWaveNumber] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getAuthorDashboard().then(data => {
      if (data) {
        setStatus(data.author.statut);
        if (data.author.statut === 'approved') {
          setLocation('/auteur/dashboard');
        }
      }
    }).finally(() => setChecking(false));
  }, [setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomPlume.trim()) { setError('Le nom de plume est obligatoire.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      let identityDocument = null;
      if (idFile) {
        const dataUrl = await fileToDataUrl(idFile);
        identityDocument = { dataUrl, filename: idFile.name };
      }
      await registerAsAuthor({ nom_plume: nomPlume, bio, wave_number: waveNumber, identityDocument });
      setSuccess(true);
      setStatus('pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur. Réessaie.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div className="max-w-3xl mx-auto space-y-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>

        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <PenLine className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Espace Auteur</h1>
              <p className="text-muted-foreground">Publie et vends tes livres directement sur BiblioTech</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[
              { icon: BookOpen, label: 'Publie ton livre', desc: 'PDF ou ePub' },
              { icon: TrendingUp, label: 'Suis tes ventes', desc: 'Stats en temps réel' },
              { icon: Wallet, label: 'Reçois tes revenus', desc: 'Via Wave / Naboopay' },
            ].map(f => (
              <div key={f.label} className="text-center p-4 bg-background rounded-xl border border-border">
                <f.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <p className="text-sm font-semibold text-foreground">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Statut pending */}
        {status === 'pending' && !success && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-6 flex items-start gap-4">
            <Clock className="w-8 h-8 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300">Demande en cours d'examen</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Ton dossier a été envoyé. Notre équipe le valide sous 24–48h. Tu recevras une notification dès l'approbation.
              </p>
            </div>
          </div>
        )}

        {status === 'rejected' && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-6 flex items-start gap-4">
            <XCircle className="w-8 h-8 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 dark:text-red-300">Demande refusée</p>
              <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                Ta demande n'a pas été acceptée. Contacte le support pour plus d'informations.
              </p>
            </div>
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-6 flex items-start gap-4">
            <CheckCircle2 className="w-8 h-8 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-800 dark:text-green-300">Demande envoyée !</p>
              <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                Notre équipe va examiner ton dossier sous 24–48h.
              </p>
            </div>
          </div>
        )}

        {/* Formulaire — seulement si pas encore inscrit */}
        {status === null && !success && (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-bold text-foreground">Créer mon espace auteur</h2>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Nom de plume *</label>
              <input
                value={nomPlume}
                onChange={e => setNomPlume(e.target.value)}
                placeholder="Ex : Aminata Diallo"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Bio courte</label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Présente-toi en quelques phrases..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Numéro Wave (pour recevoir tes revenus)</label>
              <input
                value={waveNumber}
                onChange={e => setWaveNumber(e.target.value)}
                placeholder="Ex : 77 123 45 67"
                className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="text-xs text-muted-foreground">Tu pourras l'ajouter plus tard.</p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Pièce d'identité (optionnel)</label>
              <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-background cursor-pointer hover:border-primary/40 transition-colors">
                <Upload className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-muted-foreground">
                  {idFile ? idFile.name : 'CNI, passeport ou permis (PDF, JPG, PNG — max 10 Mo)'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={e => setIdFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-muted-foreground">Accélère la validation de ton dossier.</p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi en cours...</> : 'Envoyer ma demande'}
            </button>
          </form>
        )}

      </motion.div>
    </DashboardLayout>
  );
}
