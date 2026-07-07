
import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Users, BookMarked, AlertTriangle, CreditCard, Crown, RefreshCw } from 'lucide-react';
import { useAdminStats } from './hooks/useAdminData';

export default function AdminOverview() {
  const { stats, loading, refresh } = useAdminStats();

  const cards = [
    { icon: BookOpen, label: 'Total livres', value: stats.totalBooks, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20' },
    { icon: Users, label: 'Utilisateurs', value: stats.totalUsers, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/20' },
    { icon: BookMarked, label: 'Lectures en cours', value: stats.activeBorrows, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/20' },
    { icon: AlertTriangle, label: 'En retard', value: stats.overdueBorrows, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/20' },
    { icon: Crown, label: 'Abonnés actifs', value: stats.activeSubscriptions, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/20' },
    { icon: CreditCard, label: 'Revenus ce mois', value: `${stats.revenueMonth.toLocaleString('fr-FR')} F`, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' },
  ];

  return (
    <div className="space-y-6">
      {/* Header avec refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Tableau de bord</h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Cartes de stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl p-4 space-y-3"
            >
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? '—' : typeof card.value === 'string' ? card.value : card.value}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Alertes */}
      {stats.overdueBorrows > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-medium text-sm">
            <AlertTriangle className="w-4 h-4" />
            {stats.overdueBorrows} lecture(s) expirée(s) nécessitent une attention
          </div>
        </div>
      )}

      {/* Message si données vides */}
      {!loading && stats.totalBooks === 0 && stats.totalUsers === 0 && (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Base de données vide — Commencez par ajouter des livres dans le <strong>Catalogue</strong>
          </p>
        </div>
      )}
    </div>
  );
}
