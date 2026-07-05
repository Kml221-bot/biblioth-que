#!/bin/sh
# ============================================================
# BiblioTech — Script de démarrage Docker
# 1. Attendre que PostgreSQL soit prêt
# 2. Appliquer le schéma Prisma
# 3. Lancer l'API NestJS
# ============================================================
set -e

echo ""
echo "══════════════════════════════════════════"
echo "  BiblioTech API — Démarrage Docker"
echo "══════════════════════════════════════════"

# ── Appliquer le schéma Prisma ───────────────────────────────
echo "⏳ Application du schéma Prisma sur PostgreSQL..."
npx prisma db push --skip-generate --accept-data-loss

echo "✅ Schéma Prisma synchronisé"

# ── Démarrer l'API ───────────────────────────────────────────
echo "🚀 BiblioTech NestJS API démarrée sur le port ${PORT:-3001}"
echo ""
exec node dist/nest/main.js
