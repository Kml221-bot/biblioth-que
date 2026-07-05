import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface CoinBalanceProps {
  className?: string;
  showLabel?: boolean;
}

export function CoinBalance({ className = '', showLabel = false }: CoinBalanceProps) {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchBalance = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        // Appel NestJS → /api/coins/balance (proxié vers port 3002)
        const res = await fetch('/api/coins/balance', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        setBalance(json.data?.balance ?? 0);
      } catch { /* silencieux */ }
    };

    fetchBalance();
    window.addEventListener('coinsUpdated', fetchBalance);
    return () => window.removeEventListener('coinsUpdated', fetchBalance);
  }, [user]);

  if (!user || balance === null) return null;

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 ${className}`}>
      <span className="text-sm">🪙</span>
      <span className="text-xs font-bold tabular-nums">{balance.toLocaleString()}</span>
      {showLabel && <span className="text-xs text-amber-600/70 dark:text-amber-400/70 hidden sm:inline">BiblioCoins</span>}
    </div>
  );
}
