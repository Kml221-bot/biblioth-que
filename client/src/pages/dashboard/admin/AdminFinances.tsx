
import React from 'react';
import { CreditCard, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAdminTransactions, useAdminStats } from './hooks/useAdminData';

const typeColors: Record<string, string> = {
  abonnement: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  achat: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  location: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  amende: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  commission: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  remboursement: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const statutColors: Record<string, string> = {
  completed: 'text-green-600',
  pending: 'text-amber-600',
  failed: 'text-red-600',
  refunded: 'text-gray-500',
};

export default function AdminFinances() {
  const { stats } = useAdminStats();
  const { transactions, loading } = useAdminTransactions();

  const totalCompleted = transactions
    .filter(t => t.statut === 'completed')
    .reduce((sum, t) => sum + t.montant, 0);

  const cards = [
    { label: 'Revenus ce mois', value: `${stats.revenueMonth.toLocaleString('fr-FR')} F`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' },
    { label: 'Transactions totales', value: transactions.length.toString(), icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20' },
    { label: 'Montant total complété', value: `${totalCompleted.toLocaleString('fr-FR')} F`, icon: ArrowUpRight, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/20' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats financières */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transactions récentes */}
      <div>
        <h3 className="font-semibold text-foreground mb-3">Transactions récentes</h3>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 bg-card border border-border rounded-xl">
            <CreditCard className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Aucune transaction pour le moment</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {transactions.map(t => (
              <div key={t.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  t.type === 'remboursement' ? 'bg-red-100 dark:bg-red-900/20' : 'bg-green-100 dark:bg-green-900/20'
                }`}>
                  {t.type === 'remboursement'
                    ? <ArrowDownRight className="w-4 h-4 text-red-600" />
                    : <ArrowUpRight className="w-4 h-4 text-green-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground capitalize">{t.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {t.provider && <> · via {t.provider}</>}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[t.type] || typeColors.achat}`}>
                  {t.type}
                </span>
                <span className={`text-sm font-bold ${statutColors[t.statut] || 'text-foreground'}`}>
                  {t.type === 'remboursement' ? '-' : '+'}{t.montant.toLocaleString('fr-FR')} F
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
