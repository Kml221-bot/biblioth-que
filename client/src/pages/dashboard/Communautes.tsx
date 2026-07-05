// ============================================================
// BiblioTech — Page Communautés
// Groupes d'étude & Clubs de lecture
// ============================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Search, Lock, Globe, BookOpen, GraduationCap,
  UserPlus, LogOut, Copy, Check, X, MessageSquare, Key
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import {
  useCommunities,
  useCommunityDetail,
  createCommunity,
  joinCommunity,
  leaveCommunity,
  joinByCode,
} from '@/hooks/useCommunities';

const typeIcons: Record<string, React.ReactNode> = {
  groupe_etude: <GraduationCap className="w-5 h-5" />,
  club_lecture: <BookOpen className="w-5 h-5" />,
};

const typeLabels: Record<string, string> = {
  groupe_etude: 'Groupe d\'étude',
  club_lecture: 'Club de lecture',
};

const typeColors: Record<string, string> = {
  groupe_etude: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  club_lecture: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export default function Communautes() {
  const { user } = useAuth();
  const { communities, loading, fetchCommunities } = useCommunities(user?.id);

  const [tab, setTab] = useState<'all' | 'mine'>('all');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Formulaire création
  const [newCom, setNewCom] = useState({
    nom: '', description: '', type: 'groupe_etude' as 'groupe_etude' | 'club_lecture',
    prive: false, max_membres: 30,
  });

  // Code invitation
  const [joinCode, setJoinCode] = useState('');

  const notify = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };

  const handleSearch = () => {
    fetchCommunities({ search, type: filterType, myOnly: tab === 'mine' });
  };

  const handleTabChange = (t: 'all' | 'mine') => {
    setTab(t);
    fetchCommunities({ search, type: filterType, myOnly: t === 'mine' });
  };

  const handleCreate = async () => {
    if (!newCom.nom.trim() || !user?.id) return;
    try {
      await createCommunity({ ...newCom, createur_id: user.id });
      setShowCreate(false);
      setNewCom({ nom: '', description: '', type: 'groupe_etude', prive: false, max_membres: 30 });
      fetchCommunities({ myOnly: tab === 'mine' });
      notify('✅ Communauté créée !');
    } catch { notify('❌ Erreur de création'); }
  };

  const handleJoin = async (communityId: string) => {
    if (!user?.id) return;
    try {
      await joinCommunity(communityId, user.id);
      fetchCommunities({ myOnly: tab === 'mine' });
      notify('✅ Tu as rejoint la communauté !');
    } catch { notify('❌ Erreur'); }
  };

  const handleLeave = async (communityId: string) => {
    if (!user?.id) return;
    try {
      await leaveCommunity(communityId, user.id);
      fetchCommunities({ myOnly: tab === 'mine' });
      setSelectedId(null);
      notify('👋 Tu as quitté la communauté');
    } catch { notify('❌ Erreur'); }
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim() || !user?.id) return;
    try {
      await joinByCode(joinCode.trim().toUpperCase(), user.id);
      setShowJoinCode(false);
      setJoinCode('');
      fetchCommunities({ myOnly: tab === 'mine' });
      notify('✅ Communauté rejointe via le code !');
    } catch (err) {
      notify(`❌ ${err instanceof Error ? err.message : 'Code invalide'}`);
    }
  };

  const inp = "px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <DashboardLayout>
      <motion.div className="space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Communautés</h1>
            <p className="text-sm text-muted-foreground">Groupes d'étude & clubs de lecture</p>
          </div>
        </div>

        {/* Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="px-4 py-2.5 rounded-lg bg-card border border-border text-sm font-medium">{notification}</motion.div>
          )}
        </AnimatePresence>

        {/* Tabs + Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-muted rounded-lg p-0.5">
            {[
              { id: 'all' as const, label: '🌍 Découvrir' },
              { id: 'mine' as const, label: '👥 Mes groupes' },
            ].map(t => (
              <button key={t.id} onClick={() => handleTabChange(t.id)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}>{t.label}</button>
            ))}
          </div>
          <div className="flex-1" />
          <button onClick={() => setShowJoinCode(v => !v)}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted">
            <Key className="w-4 h-4" /> Code
          </button>
          <button onClick={() => setShowCreate(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Créer
          </button>
        </div>

        {/* Rejoindre par code */}
        <AnimatePresence>
          {showJoinCode && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden">
              <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <Key className="w-5 h-5 text-amber-500" />
                <input type="text" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Code d'invitation (ex: A3BX9K)"
                  maxLength={8}
                  className={`${inp} flex-1 uppercase tracking-widest font-mono`} />
                <button onClick={handleJoinByCode}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
                  Rejoindre
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Formulaire création */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden">
              <div className="bg-card border border-primary/30 rounded-xl p-5 space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" /> Nouvelle communauté
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input placeholder="Nom du groupe *" value={newCom.nom} onChange={e => setNewCom(p => ({ ...p, nom: e.target.value }))} className={`${inp} col-span-full`} />
                  <textarea placeholder="Description (optionnel)" value={newCom.description} onChange={e => setNewCom(p => ({ ...p, description: e.target.value }))} className={`${inp} col-span-full`} rows={2} />
                  <select value={newCom.type} onChange={e => setNewCom(p => ({ ...p, type: e.target.value as any }))} className={inp}>
                    <option value="groupe_etude">📚 Groupe d'étude</option>
                    <option value="club_lecture">📖 Club de lecture</option>
                  </select>
                  <input type="number" placeholder="Max membres" value={newCom.max_membres} onChange={e => setNewCom(p => ({ ...p, max_membres: +e.target.value }))} className={inp} />
                  <label className="flex items-center gap-2 col-span-full">
                    <input type="checkbox" checked={newCom.prive} onChange={e => setNewCom(p => ({ ...p, prive: e.target.checked }))} className="w-4 h-4" />
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Communauté privée (code d'invitation requis)</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
                    <Check className="w-4 h-4" /> Créer
                  </button>
                  <button onClick={() => setShowCreate(false)} className="px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted">
                    Annuler
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recherche */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Rechercher une communauté..." className={`${inp} w-full pl-9`} />
          </div>
          <select value={filterType} onChange={e => { setFilterType(e.target.value); }} className={inp}>
            <option value="">Tous les types</option>
            <option value="groupe_etude">Groupes d'étude</option>
            <option value="club_lecture">Clubs de lecture</option>
          </select>
          <button onClick={handleSearch} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
            Rechercher
          </button>
        </div>

        {/* Liste des communautés */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : communities.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium text-foreground mb-1">
              {tab === 'mine' ? 'Tu n\'as rejoint aucune communauté' : 'Aucune communauté trouvée'}
            </p>
            <p className="text-sm text-muted-foreground">
              {tab === 'mine' ? 'Explore les communautés existantes ou crée la tienne !' : 'Sois le premier à créer une communauté !'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {communities.map(com => (
              <motion.div key={com.id} layout
                className="bg-card border border-border rounded-xl p-5 space-y-3 hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => setSelectedId(selectedId === com.id ? null : com.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${typeColors[com.type] || 'bg-gray-100'}`}>
                    {typeIcons[com.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-foreground truncate">{com.nom}</h3>
                      {com.prive && <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {com.description || typeLabels[com.type]}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {com.membres_count}/{com.max_membres} membres
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-medium ${typeColors[com.type]}`}>
                    {typeLabels[com.type]}
                  </span>
                  {com.is_member && (
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium">
                      ✓ Membre
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  {com.is_member ? (
                    <>
                      <button onClick={e => { e.stopPropagation(); setSelectedId(com.id); }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20">
                        <MessageSquare className="w-3.5 h-3.5" /> Voir
                      </button>
                      <button onClick={e => { e.stopPropagation(); handleLeave(com.id); }}
                        className="flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-500 rounded-lg text-xs hover:bg-red-50 dark:hover:bg-red-900/20">
                        <LogOut className="w-3.5 h-3.5" /> Quitter
                      </button>
                    </>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); handleJoin(com.id); }}
                      disabled={com.prive || com.membres_count >= com.max_membres}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
                      <UserPlus className="w-3.5 h-3.5" />
                      {com.prive ? 'Code requis' : com.membres_count >= com.max_membres ? 'Complet' : 'Rejoindre'}
                    </button>
                  )}
                </div>

                {/* Code d'invitation (si créateur) */}
                {com.code_invitation && com.createur_id === user?.id && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs">
                    <Key className="w-3.5 h-3.5 text-amber-500" />
                    <span className="font-mono tracking-widest font-bold text-amber-700 dark:text-amber-400">{com.code_invitation}</span>
                    <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(com.code_invitation!); notify('📋 Code copié !'); }}
                      className="ml-auto p-1 hover:bg-amber-100 dark:hover:bg-amber-800/30 rounded">
                      <Copy className="w-3.5 h-3.5 text-amber-600" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Détail communauté (drawer) */}
        <AnimatePresence>
          {selectedId && (
            <CommunityDetailDrawer
              communityId={selectedId}
              userId={user?.id}
              onClose={() => setSelectedId(null)}
              onLeave={() => { handleLeave(selectedId); }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </DashboardLayout>
  );
}

// ── Drawer détails communauté ────────────────────────────────

function CommunityDetailDrawer({ communityId, userId, onClose, onLeave }: {
  communityId: string;
  userId?: string;
  onClose: () => void;
  onLeave: () => void;
}) {
  const { community, members, sharedNotes, isMember, myRole, loading } = useCommunityDetail(communityId, userId);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </motion.div>
    );
  }

  if (!community) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-5 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${typeColors[community.type]}`}>
                {typeIcons[community.type]}
              </div>
              <div>
                <h2 className="font-bold text-foreground text-lg">{community.nom}</h2>
                <p className="text-xs text-muted-foreground">{typeLabels[community.type]} · {members.length} membres</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
              <X className="w-5 h-5" />
            </button>
          </div>
          {community.description && (
            <p className="text-sm text-muted-foreground mt-3">{community.description}</p>
          )}
        </div>

        {/* Membres */}
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm mb-3">👥 Membres ({members.length})</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                  {m.user_name?.charAt(0) || '?'}
                </div>
                <span className="text-sm text-foreground flex-1 truncate">{m.user_name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  m.role === 'admin' ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  : m.role === 'moderator' ? 'bg-amber-100 text-amber-600'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                }`}>{m.role}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notes partagées */}
        <div className="p-5">
          <h3 className="font-semibold text-foreground text-sm mb-3">📝 Notes partagées ({sharedNotes.length})</h3>
          {sharedNotes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Aucune note partagée pour le moment
            </p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {sharedNotes.map(note => (
                <div key={note.id} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-primary">Page {note.page}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(note.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground">{note.contenu}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {isMember && (
          <div className="p-5 border-t border-border">
            <button onClick={onLeave}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-500 rounded-lg text-sm hover:bg-red-50 dark:hover:bg-red-900/20">
              <LogOut className="w-4 h-4" /> Quitter cette communauté
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
