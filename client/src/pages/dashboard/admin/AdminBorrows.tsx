// ============================================================
// BiblioTech Admin — Gestion Emprunts (Section C)
// ============================================================

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookMarked, Clock, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react';
import { useAdminBorrows } from './hooks/useAdminData';

const statutColors: Record<string, string> = {
  actif: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  prolonge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  retard: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  rendu: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default function AdminBorrows() {
  const { borrows, loading, fetchBorrows, updateBorrow } = useAdminBorrows();
  const [filterStatut, setFilterStatut] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  const notify = (msg: string) => { setNotification(msg); setTimeout(() => setNotification(null), 3000); };

  const handleFilter = (statut: string) => {
    setFilterStatut(statut);
    fetchBorrows({ statut: statut || undefined });
  };

  const handleForceReturn = async (id: string) => {
    try {
      await updateBorrow(id, { statut: 'rendu', fin_reelle: new Date().toISOString() } as any);
      fetchBorrows({ statut: filterStatut || undefined });
      notify('✅ Emprunt marqué comme rendu');
    } catch { notify('❌ Erreur'); }
  };

  const handleExtend = async (id: string, finPrevue: string) => {
    try {
      const newDate = new Date(finPrevue);
      newDate.setDate(newDate.getDate() + 7);
      await updateBorrow(id, { fin_prevue: newDate.toISOString(), statut: 'prolonge' } as any);
      fetchBorrows({ statut: filterStatut || undefined });
      notify('✅ Emprunt prolongé de 7 jours');
    } catch { notify('❌ Erreur'); }
  };

  const statuts = [
    { value: '', label: 'Tous', count: borrows.length },
    { value: 'actif', label: 'Actifs', icon: CheckCircle, color: 'text-green-600' },
    { value: 'retard', label: 'En retard', icon: AlertTriangle, color: 'text-red-600' },
    { value: 'prolonge', label: 'Prolongés', icon: Clock, color: 'text-blue-600' },
    { value: 'rendu', label: 'Rendus', icon: BookMarked, color: 'text-gray-500' },
  ];

  return (
    <div className="space-y-4">
      {notification && (
        <div className="px-4 py-2.5 rounded-lg bg-card border border-border text-sm font-medium">{notification}</div>
      )}

      {/* Filtres par statut */}
      <div className="flex gap-2 flex-wrap">
        {statuts.map(s => (
          <button key={s.value} onClick={() => handleFilter(s.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterStatut === s.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : borrows.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <BookMarked className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Aucun emprunt trouvé</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {borrows.map(b => {
            const isOverdue = b.statut === 'retard' || (b.statut === 'actif' && new Date(b.fin_prevue) < new Date());
            const daysLeft = Math.ceil((new Date(b.fin_prevue).getTime() - Date.now()) / 86400000);
            return (
              <motion.div key={b.id} layout
                className={`bg-card border rounded-xl px-4 py-3 flex items-center gap-3 ${
                  isOverdue ? 'border-red-300 dark:border-red-700' : 'border-border'
                }`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    Livre: {b.book_id.slice(0, 8)}...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    User: {b.user_id.slice(0, 8)}... · Depuis le {new Date(b.debut).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground">Retour prévu</p>
                  <p className={`text-sm font-semibold ${isOverdue ? 'text-red-600' : 'text-foreground'}`}>
                    {new Date(b.fin_prevue).toLocaleDateString('fr-FR')}
                  </p>
                  <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {isOverdue ? `${Math.abs(daysLeft)}j de retard` : `${daysLeft}j restants`}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statutColors[b.statut] || statutColors.actif}`}>
                  {b.statut}
                </span>
                {b.penalite_fcfa > 0 && (
                  <span className="text-xs text-red-600 font-semibold">{b.penalite_fcfa} F</span>
                )}
                {/* Actions */}
                {b.statut !== 'rendu' && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => handleExtend(b.id, b.fin_prevue)} title="Prolonger"
                      className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleForceReturn(b.id)} title="Forcer retour"
                      className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20">
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
