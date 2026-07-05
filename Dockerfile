# ═══════════════════════════════════════════════════════════════
# BiblioTech — Dockerfile multi-stage (NestJS)
# Stage 1 : deps    → npm ci
# Stage 2 : builder → tsc + prisma generate
# Stage 3 : runner  → image de production légère
# ═══════════════════════════════════════════════════════════════

# ── Stage 1 : dépendances ──────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

# Copier les fichiers de lock avant le code source (cache layer)
COPY package.json package-lock.json ./

# Installer toutes les dépendances (prod + dev nécessaires au build)
RUN npm ci --ignore-scripts

# ── Stage 2 : compilation TypeScript ──────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Compiler le backend NestJS → dist/nest/
RUN npm run build:nest

# ── Stage 3 : image de production ─────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Utilisateur non-root pour la sécurité
RUN addgroup --system --gid 1001 bibliotech \
 && adduser  --system --uid 1001 bibliotech

# Dépendances de production uniquement
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# Code compilé
COPY --from=builder /app/dist/nest      ./dist/nest

# Client Prisma généré (évite de le régénérer au runtime)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Schéma Prisma (nécessaire pour prisma db push/migrate)
COPY prisma ./prisma

# Script de démarrage
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh \
 && chown -R bibliotech:bibliotech /app

USER bibliotech

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["./docker-entrypoint.sh"]
