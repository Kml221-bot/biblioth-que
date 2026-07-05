import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Coins, Clock, TrendingUp, Check, Loader2, Zap } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  nestGetCoinBalance,
  nestGetCoinPacks,
  nestPurchaseCoins,
  nestGetCoinTransactions,
  nestInitiateCoinsPayment,
  type CoinPack,
} from '@/services/nestApiService';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description?: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  purchase: { label: 'Achat',     color: 'text-green-500' },
  unlock:   { label: 'Déblocage', color: 'text-amber-500' },
  bonus:    { label: 'Bonus',     color: 'text-blue-500'  },
  refund:   { label: 'Remboursement', color: 'text-purple-500' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export default function CoinShop() {
  const [balance, setBalance] = useState<number | null>(null);
  const [packs, setPacks] = useState<CoinPack[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [successPack, setSuccessPack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const [bal, pks, txs] = await Promise.all([
        nestGetCoinBalance(),
        nestGetCoinPacks(),
        nestGetCoinTransactions(),
      ]);
      setBalance(bal.balance);
      setPacks(pks);
      setTransactions((txs as Transaction[]).slice(0, 10));
    } catch { /* silencieux */ }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  // Paiement Wave / Orange Money via Naboopay (production)
  const handleWavePayment = async (pack: CoinPack) => {
    setPurchasing(pack.id);
    setError(null);
    try {
      const result = await nestInitiateCoinsPayment(pack.id);
      // Rediriger vers la page Naboopay (Wave / Orange Money)
      window.location.href = result.paymentUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Paiement Wave indisponible — utilise le mode démo');
      setPurchasing(null);
    }
  };

  // Crédit direct (mode démo / sandbox Naboopay)
  const handlePurchase = async (pack: CoinPack) => {
    setPurchasing(pack.id);
    setError(null);
    try {
      const result = await nestPurchaseCoins(pack.id);
      setBalance(result.balance);
      setSuccessPack(pack.id);
      window.dispatchEvent(new Event('coinsUpdated'));
      await nestGetCoinTransactions().then(txs =>
        setTransactions((txs as Transaction[]).slice(0, 10))
      );
      setTimeout(() => setSuccessPack(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'achat');
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <DashboardLayout>
      <motion.div
        className="space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* En-tête */}
        <motion.div variants={itemVariants}>
          <h1 className="text-3xl font-bold text-foreground mb-1">BiblioCoins Shop</h1>
          <p className="text-muted-foreground">
            Achetez des BiblioCoins pour débloquer des chapitres
          </p>
        </motion.div>

        {/* Solde actuel */}
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-4 px-6 py-5 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-yellow-500/5"
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center">
            <span className="text-2xl">🪙</span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Votre solde actuel</p>
            <p className="text-4xl font-bold text-foreground tabular-nums">
              {balance !== null ? balance.toLocaleString() : '—'}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">BiblioCoins</p>
          </div>
          <div className="ml-auto hidden sm:block text-right">
            <p className="text-xs text-muted-foreground">1 chapitre ≈ 5–20 coins</p>
            <p className="text-xs text-muted-foreground">Les 3 premiers chapitres sont gratuits</p>
          </div>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </motion.div>
        )}

        {/* Packs */}
        <motion.div variants={itemVariants}>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Packs disponibles
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {packs.map((pack) => (
                <motion.div
                  key={pack.id}
                  whileHover={{ y: -4 }}
                  className={`relative rounded-2xl border p-5 flex flex-col gap-4 transition-colors ${
                    pack.isPopular
                      ? 'border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-amber-500/5 shadow-lg shadow-amber-500/10'
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
                >
                  {pack.isPopular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-amber-500 text-white rounded-full">
                      Populaire
                    </span>
                  )}

                  <div className="text-center pt-1">
                    <span className="text-3xl">🪙</span>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {pack.coins.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">BiblioCoins</p>
                  </div>

                  <div className="text-center">
                    <p className="font-semibold text-foreground">{pack.label}</p>
                    <p className="text-2xl font-bold text-primary mt-1">
                      {pack.prixFcfa.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">FCFA</span>
                    </p>
                  </div>

                  {/* Bouton Wave / Orange Money (production) */}
                  <button
                    onClick={() => handleWavePayment(pack)}
                    disabled={purchasing !== null}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                      pack.isPopular
                        ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20'
                        : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {purchasing === pack.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>💳 Payer par Wave / Orange</>
                    )}
                  </button>

                  {/* Mode démo sandbox */}
                  <button
                    onClick={() => handlePurchase(pack)}
                    disabled={purchasing !== null}
                    className="w-full flex items-center justify-center gap-2 py-1.5 rounded-xl text-xs font-medium border border-border text-muted-foreground hover:bg-muted/50 transition-all disabled:opacity-50"
                  >
                    {successPack === pack.id ? (
                      <><Check className="w-3 h-3 text-green-500" /> Crédité !</>
                    ) : (
                      '🧪 Mode démo (sandbox)'
                    )}
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Historique transactions */}
        {transactions.length > 0 && (
          <motion.div variants={itemVariants}>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              Historique récent
            </h2>
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              {transactions.map((tx, i) => {
                const meta = TYPE_LABELS[tx.type] ?? { label: tx.type, color: 'text-foreground' };
                const isCredit = tx.amount > 0;
                return (
                  <div
                    key={tx.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      i < transactions.length - 1 ? 'border-b border-border/50' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      isCredit ? 'bg-green-500/10' : 'bg-amber-500/10'
                    }`}>
                      {isCredit ? '➕' : '🔓'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {tx.description ?? meta.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.createdAt).toLocaleDateString('fr-FR', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-sm font-bold ${isCredit ? 'text-green-500' : 'text-amber-500'}`}>
                        {isCredit ? '+' : ''}{tx.amount} 🪙
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Solde : {tx.balanceAfter}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </motion.div>
    </DashboardLayout>
  );
}
