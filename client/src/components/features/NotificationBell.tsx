
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, X, BookOpen, Clock, Trophy, ShoppingBag,
  Sparkles, AlertTriangle, CheckCircle, Info, Brain, RefreshCw,
} from 'lucide-react';
import { getActiveBorrows, getDaysLeft } from '@/services/borrowStore';
import { playNotification, playClick } from '@/services/audioFeedback';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ───────────────────────────────────────────────────
interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  icon: React.ElementType;
  title: string;
  message: string;
  time: string;
  read: boolean;
  source: 'api' | 'local';   // origine
  actionUrl?: string | null;
}

// Icônes disponibles depuis la metadata serveur
const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen, Clock, Trophy, ShoppingBag, Sparkles,
  AlertTriangle, CheckCircle, Info, Brain, Bell,
};

const TYPE_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  info:    { bg: 'bg-blue-50 dark:bg-blue-900/20',   text: 'text-blue-600 dark:text-blue-400',   dot: 'bg-blue-500' },
  success: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', dot: 'bg-green-500' },
  warning: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  alert:   { bg: 'bg-red-50 dark:bg-red-900/20',     text: 'text-red-600 dark:text-red-400',     dot: 'bg-red-500' },
};

// ─── Persistance état lu ─────────────────────────────────────
const READ_KEY = 'bibliotech:notifications:read';

function getReadIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]')); }
  catch { return new Set(); }
}

function markReadLocal(id: string) {
  const ids = getReadIds();
  ids.add(id);
  localStorage.setItem(READ_KEY, JSON.stringify(Array.from(ids)));
}

function markAllReadLocal(ids: string[]) {
  const existing = getReadIds();
  ids.forEach(id => existing.add(id));
  localStorage.setItem(READ_KEY, JSON.stringify(Array.from(existing)));
}

// ─── Notifications locales (emprunts en cours) ───────────────
function buildLocalNotifications(readIds: Set<string>): AppNotification[] {
  const list: AppNotification[] = [];
  const borrows = getActiveBorrows();

  borrows.forEach(b => {
    const days = getDaysLeft(b.dueDate);
    if (days <= 0) {
      list.push({
        id: `overdue-${b.id}`,
        type: 'alert',
        icon: AlertTriangle,
        title: 'Retour en retard',
        message: `"${b.title}" aurait dû être rendu. Pensez à le retourner.`,
        time: 'En retard',
        read: readIds.has(`overdue-${b.id}`),
        source: 'local',
        actionUrl: '/emprunts',
      });
    } else if (days <= 3) {
      list.push({
        id: `due-soon-${b.id}`,
        type: 'alert',
        icon: AlertTriangle,
        title: 'Retour très bientôt !',
        message: `"${b.title}" doit être rendu dans ${days} jour${days > 1 ? 's' : ''}.`,
        time: `${days}j restants`,
        read: readIds.has(`due-soon-${b.id}`),
        source: 'local',
        actionUrl: '/emprunts',
      });
    } else if (days <= 7) {
      list.push({
        id: `due-${b.id}`,
        type: 'warning',
        icon: Clock,
        title: 'Retour dans une semaine',
        message: `"${b.title}" doit être rendu dans ${days} jours.`,
        time: `${days}j restants`,
        read: readIds.has(`due-${b.id}`),
        source: 'local',
        actionUrl: '/emprunts',
      });
    }
  });

  return list;
}

// ─── Notification API → AppNotification ─────────────────────
function mapApiNotification(
  n: { id: string; title: string; message: string; isRead: boolean; type: string; actionUrl?: string | null; createdAt: string; icon?: string | null },
  readIds: Set<string>
): AppNotification {
  const type = (['info', 'success', 'warning', 'alert'].includes(n.type) ? n.type : 'info') as AppNotification['type'];
  const Icon = (n.icon && ICON_MAP[n.icon]) ? ICON_MAP[n.icon] : Bell;
  const isRead = n.isRead || readIds.has(n.id);
  const date = new Date(n.createdAt);
  const diffMin = Math.round((Date.now() - date.getTime()) / 60000);
  const time = diffMin < 1 ? 'À l\'instant'
    : diffMin < 60 ? `Il y a ${diffMin}min`
    : diffMin < 1440 ? `Il y a ${Math.round(diffMin / 60)}h`
    : `Il y a ${Math.round(diffMin / 1440)}j`;

  return { id: n.id, type, icon: Icon, title: n.title, message: n.message, time, read: isRead, source: 'api', actionUrl: n.actionUrl };
}

// ─── Composant Principal ─────────────────────────────────────
export const NotificationBell: React.FC = () => {
  const { session } = useAuth();
  const [isOpen, setIsOpen]           = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading]         = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Fetch API + fusion locale ─────────────────────────────
  const refresh = useCallback(async () => {
    const readIds = getReadIds();
    const local   = buildLocalNotifications(readIds);

    if (!session?.access_token) {
      setNotifications(local);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const { data } = await res.json() as { data: Parameters<typeof mapApiNotification>[0][] };
        const api = (data || []).map(n => mapApiNotification(n, readIds));
        // API en premier, alertes locales ensuite (dédupliquées par id)
        const apiIds = new Set(api.map(n => n.id));
        const merged = [...api, ...local.filter(n => !apiIds.has(n.id))];
        setNotifications(merged);
      } else {
        setNotifications(local);
      }
    } catch {
      setNotifications(local);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => { refresh(); }, [refresh]);

  // Fermer au clic extérieur
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // ── Marquer une notification comme lue ───────────────────
  const markRead = async (id: string, source: 'api' | 'local') => {
    markReadLocal(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

    if (source === 'api' && session?.access_token) {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => null);
    }
  };

  // ── Tout marquer comme lu ────────────────────────────────
  const markAllRead = async () => {
    const allIds = notifications.map(n => n.id);
    markAllReadLocal(allIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    if (session?.access_token) {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => null);
    }
  };

  // ── Supprimer une notification ───────────────────────────
  const dismiss = async (id: string, source: 'api' | 'local') => {
    playClick();
    markReadLocal(id);
    setNotifications(prev => prev.filter(n => n.id !== id));

    if (source === 'api' && session?.access_token) {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => null);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bouton cloche */}
      <button
        onClick={() => {
          if (!isOpen) { playNotification(); refresh(); }
          setIsOpen(v => !v);
        }}
        className="relative p-2 hover:bg-muted rounded-xl transition-colors duration-200"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
      >
        <Bell className="w-5 h-5 text-foreground" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Panneau */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full mt-2 w-96 bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 bg-muted/30">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-foreground text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full">
                    {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Rafraîchir */}
                <button
                  onClick={refresh}
                  className="p-1 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Rafraîchir"
                  disabled={loading}
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
                </button>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-primary font-medium hover:underline">
                    Tout lu
                  </button>
                )}
              </div>
            </div>

            {/* Liste */}
            <div className="max-h-[420px] overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin opacity-40" />
                  <p className="text-sm">Chargement…</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucune notification</p>
                  <p className="text-xs mt-1 opacity-60">Tes activités apparaîtront ici</p>
                </div>
              ) : (
                notifications.map((notif, idx) => {
                  const style = TYPE_STYLES[notif.type];
                  const Icon = notif.icon;
                  return (
                    <motion.div
                      key={notif.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className={`group flex items-start gap-3 px-5 py-3.5 border-b border-border/30 transition-colors cursor-default ${
                        !notif.read ? 'bg-primary/[0.03] hover:bg-primary/[0.06]' : 'hover:bg-muted/40'
                      }`}
                      onClick={() => { if (!notif.read) markRead(notif.id, notif.source); }}
                    >
                      {/* Icône */}
                      <div className={`w-9 h-9 rounded-xl ${style.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon className={`w-4 h-4 ${style.text}`} />
                      </div>

                      {/* Contenu */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {!notif.read && (
                            <span className={`w-2 h-2 rounded-full ${style.dot} flex-shrink-0`} />
                          )}
                          <p className={`text-sm font-semibold text-foreground truncate ${!notif.read ? '' : 'opacity-80'}`}>
                            {notif.title}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px] text-muted-foreground/60">{notif.time}</p>
                          {notif.actionUrl && (
                            <a
                              href={notif.actionUrl}
                              onClick={e => e.stopPropagation()}
                              className="text-[10px] text-primary hover:underline"
                            >
                              Voir →
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Dismiss */}
                      <button
                        onClick={(e) => { e.stopPropagation(); dismiss(notif.id, notif.source); }}
                        className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted transition-all flex-shrink-0"
                        aria-label="Ignorer"
                      >
                        <X className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border/60 bg-muted/20 flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground/50">
                {notifications.length} notification{notifications.length > 1 ? 's' : ''}
              </p>
              <button onClick={() => setIsOpen(false)} className="text-xs text-primary font-medium hover:underline">
                Fermer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
