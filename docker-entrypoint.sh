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


# ── Démarrer l'API ───────────────────────────────────────────
echo "🚀 BiblioTech NestJS API démarrée sur le port ${PORT:-3001}"
echo ""
exec node -e "require('./dist/nest/main.js')"
