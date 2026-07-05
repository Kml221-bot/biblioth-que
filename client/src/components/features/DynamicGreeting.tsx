import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface DynamicGreetingProps {
  firstName?: string;
  weatherTemp?: number | null;
}

// ─── Pool de messages par tranche horaire ─────────────────────
const MESSAGES: Record<string, { greeting: string; sub: string[] }[]> = {
  nuit: [
    { greeting: 'Encore debout 🌙',
      sub: ['Les noctambules font les meilleurs lecteurs.', 'Encore quelques pages avant de dormir ?', 'La nuit porte conseil… et de bonnes lectures.'] },
    { greeting: 'Bonne nuit ⭐',
      sub: ['Un chapitre de plus ne fera pas de mal.', 'Les plus belles histoires se lisent la nuit.'] },
  ],
  matin: [
    { greeting: 'Bonjour ☀️',
      sub: ['Une belle matinée pour commencer un nouveau livre.', 'Les meilleurs lecteurs commencent tôt.', 'Une page le matin, dix la nuit. Par quoi commençons-nous ?'] },
    { greeting: 'Belle matinée 🌅',
      sub: ['Votre prochaine grande découverte vous attend.', 'Commencez bien la journée avec une bonne lecture.'] },
  ],
  midi: [
    { greeting: 'Bonne pause 🍽️',
      sub: ['Quelques pages avant de reprendre ?', 'Votre pause mérite un bon livre.', 'Un chapitre court pour recharger les batteries.'] },
    { greeting: 'Il est midi 📖',
      sub: ['La mi-journée, idéale pour une lecture express.', 'Profitez de la pause pour explorer le catalogue.'] },
  ],
  apremidi: [
    { greeting: 'Bon après-midi ☕',
      sub: ['L\'heure parfaite pour une lecture concentrée.', 'Un café et un bon livre — combo parfait.', 'Votre prochaine grande découverte vous attend.'] },
    { greeting: 'Bel après-midi 📚',
      sub: ['Plongez dans un monde différent du vôtre.', 'Encore quelques heures de lumière pour lire.'] },
  ],
  soir: [
    { greeting: 'Bonsoir 🌆',
      sub: ['Terminez votre journée avec quelque chose d\'enrichissant.', 'Les plus belles lectures se font le soir.', 'Plongez dans un roman après cette longue journée.'] },
    { greeting: 'Belle soirée 🌙',
      sub: ['Le moment idéal pour s\'évader dans un livre.', 'La soirée est faite pour les grandes histoires.'] },
  ],
};

// Messages spéciaux selon le jour
const DAY_MESSAGES: Record<number, string> = {
  1: '💪 Bon début de semaine !',
  5: '🎉 C\'est vendredi — le weekend est parfait pour rattraper vos lectures.',
  6: '📖 Bon samedi ! Profitez pour lire sans contrainte.',
  0: '☀️ Bon dimanche ! Une journée idéale pour se perdre dans un livre.',
};

function getSlot(hour: number): string {
  if (hour >= 0 && hour < 6)   return 'nuit';
  if (hour >= 6 && hour < 12)  return 'matin';
  if (hour >= 12 && hour < 14) return 'midi';
  if (hour >= 14 && hour < 18) return 'apremidi';
  return 'soir';
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Hook : choisit un message stable pour la session ─────────
function useGreetingMessage(slot: string) {
  const [message, setMessage] = useState<{ greeting: string; sub: string } | null>(null);

  useEffect(() => {
    const key = `bibliotech:greeting:${slot}`;
    const stored = sessionStorage.getItem(key);
    if (stored) {
      setMessage(JSON.parse(stored));
      return;
    }
    const pool = MESSAGES[slot];
    const picked = pickRandom(pool);
    const sub = pickRandom(picked.sub);
    const m = { greeting: picked.greeting, sub };
    sessionStorage.setItem(key, JSON.stringify(m));
    setMessage(m);
  }, [slot]);

  return message;
}

// ─── Composant principal ───────────────────────────────────────
export function DynamicGreeting({ firstName, weatherTemp }: DynamicGreetingProps) {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const slot = getSlot(hour);
  const message = useGreetingMessage(slot);
  const dayMessage = DAY_MESSAGES[day];

  // Message météo si temp disponible
  const weatherNote =
    weatherTemp !== null && weatherTemp !== undefined
      ? weatherTemp >= 33
        ? `Il fait ${Math.round(weatherTemp)}°C à Dakar — restez au frais avec un bon livre. 🌡️`
        : weatherTemp <= 20
          ? `Il fait frais ce soir (${Math.round(weatherTemp)}°C) — idéal pour lire. 🧥`
          : null
      : null;

  const displayName = firstName ? `, ${firstName}` : '';

  if (!message) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Titre principal */}
      <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-1 leading-tight">
        {message.greeting}{displayName} !
      </h1>

      {/* Sous-message contextuel */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-base sm:text-lg text-muted-foreground"
      >
        {message.sub}
      </motion.p>

      {/* Badges contextuels */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="flex flex-wrap gap-2 mt-3"
      >
        {dayMessage && (
          <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
            {dayMessage}
          </span>
        )}
        {weatherNote && (
          <span className="inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
            {weatherNote}
          </span>
        )}
      </motion.div>
    </motion.div>
  );
}
