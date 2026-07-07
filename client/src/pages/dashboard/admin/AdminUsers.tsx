
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Users, Shield, Ban, CheckCircle, Crown } from 'lucide-react';
import { useAdminUsers } from './hooks/useAdminData';

const planBadge: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  student: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  premium: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  school: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export default function AdminUsers() {
  const { users, total, loading, fetchUsers, updateUser } = useAdminUsers();
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  const notify = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };

  const handleSearch = () => fetchUsers({ search, plan: filterPlan });

  const handleToggleBan = async (id: string, currentActive: boolean) => {
    try {
      await updateUser(id, { is_active: !currentActive });
      fetchUsers({ search, plan: filterPlan });
      notify(currentActive ? '🚫 Utilisateur banni' : '✅ Utilisateur réactivé');
    } catch { notify('❌ Erreur'); }
  };

  const handleChangePlan = async (id: string, plan: string) => {
    try {
      await updateUser(id, { plan } as any);
      fetchUsers({ search, plan: filterPlan });
      notify(`✅ Plan changé en ${plan}`);
    } catch { notify('❌ Erreur'); }
  };

  const inp = "px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="space-y-4">
      {notification && (
        <div className="px-4 py-2.5 rounded-lg bg-card border border-border text-sm font-medium">{notification}</div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Rechercher nom, email..." className={`${inp} w-full pl-9`} />
        </div>
        <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)} className={inp}>
          <option value="">Tous les plans</option>
          <option value="free">Free</option>
          <option value="student">Étudiant</option>
          <option value="premium">Premium</option>
          <option value="school">École</option>
        </select>
        <button onClick={handleSearch} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
          Filtrer
        </button>
      </div>

      <p className="text-xs text-muted-foreground">{total} utilisateur(s)</p>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Aucun utilisateur inscrit</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {users.map(u => (
            <motion.div key={u.id} layout
              className={`bg-card border rounded-xl px-4 py-3 flex items-center gap-3 transition-colors ${
                u.is_active ? 'border-border hover:border-primary/30' : 'border-red-200 dark:border-red-800 opacity-60'
              }`}>
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                {u.first_name?.[0] || '?'}{u.last_name?.[0] || ''}
              </div>
              {/* Infos */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  {u.first_name} {u.last_name}
                  {u.role === 'admin' && <Shield className="w-3.5 h-3.5 text-red-500" />}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {u.email} · {u.universite || 'Université non renseignée'}
                </p>
              </div>
              {/* Badge plan */}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planBadge[u.plan] || planBadge.free}`}>
                {u.plan}
              </span>
              {/* Wallet */}
              <span className="text-xs text-muted-foreground">{u.wallet_balance.toLocaleString('fr-FR')} F</span>
              {/* Actions */}
              <select value={u.plan} onChange={e => handleChangePlan(u.id, e.target.value)}
                className="text-xs px-2 py-1 rounded border border-border bg-background text-foreground">
                <option value="free">Free</option>
                <option value="student">Étudiant</option>
                <option value="premium">Premium</option>
              </select>
              <button onClick={() => handleToggleBan(u.id, u.is_active)}
                className={`p-1.5 rounded-lg transition-colors ${
                  u.is_active
                    ? 'text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                    : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                }`}>
                {u.is_active ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
