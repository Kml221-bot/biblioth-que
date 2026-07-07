
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, CloudOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function NetworkIndicator() {
  const { isOnline, wasOffline } = useNetworkStatus();

  return (
    <AnimatePresence>
      {/* Bandeau hors-ligne */}
      {!isOnline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2.5 shadow-lg"
        >
          <div className="flex items-center justify-center gap-2 text-sm font-medium">
            <WifiOff className="w-4 h-4" />
            <span>Mode hors-ligne — Tes livres téléchargés restent accessibles</span>
            <CloudOff className="w-4 h-4 opacity-60" />
          </div>
        </motion.div>
      )}

      {/* Notification retour en ligne */}
      {isOnline && wasOffline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2.5 shadow-lg"
        >
          <div className="flex items-center justify-center gap-2 text-sm font-medium">
            <Wifi className="w-4 h-4" />
            <span>De retour en ligne — Synchronisation en cours ✅</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
