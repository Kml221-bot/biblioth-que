// ============================================================
// BiblioTech — Serveur Express
// Sert l'API chat + les fichiers statiques en production
// ============================================================

import * as Sentry from "@sentry/node";
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import compression from "compression";
import { config } from "dotenv";
import helmet from "helmet";
import { startBorrowCronJobs } from "./jobs/borrowCron.js";
import { logError, logger } from "./lib/logger.js";
import chatRouter from "./routes/chat.js";
import readerRouter from "./routes/reader.js";
import readerProxyRouter from "./routes/readerProxy.js";
import adminRouter from "./routes/admin.js";
import searchRouter from "./routes/search.js";
import booksRouter from "./routes/books.js";
import borrowsRouter from "./routes/borrows.js";
import paymentsRouter from "./routes/payments.js";
import authorsRouter from "./routes/authors.js";
import subscriptionsRouter from "./routes/subscriptions.js";
import notesRouter from "./routes/notes.js";
import admin2faRouter from "./routes/admin2fa.js";
import notificationsUserRouter from "./routes/notificationsUser.js";

// Charger les variables d'environnement (avant tout le reste)
config();

// Sentry — actif uniquement si SENTRY_DSN est défini
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getAllowedOrigins(): string[] {
  return (process.env.CORS_ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:5173")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.disable("x-powered-by");
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }));
  app.use(compression());

  // ── Middlewares ──────────────────────────────────────────
  app.use(cors({
    origin: getAllowedOrigins(),
    credentials: true,
  }));
  app.use(express.json({
    limit: "60mb",
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf.toString("utf8");
    },
  }));
  app.use(express.urlencoded({ extended: true }));
  app.use((req, _res, next) => {
    logger.info("http_request", {
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
    next();
  });

  // ── Routes API ───────────────────────────────────────────
  app.use("/api/chat", chatRouter);
  app.use("/api/reader", readerRouter);
  app.use("/api/reader", readerProxyRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/search", searchRouter);
  app.use("/api/books", booksRouter);
  app.use("/api/borrows", borrowsRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/authors", authorsRouter);
  app.use("/api/subscriptions", subscriptionsRouter);
  app.use("/api/notes", notesRouter);
  app.use("/api/admin/2fa", admin2faRouter);
  app.use("/api/notifications", notificationsUserRouter);

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      service: "BiblioTech API",
      ai: process.env.OPENROUTER_API_KEY ? "configured" : "missing key",
      timestamp: new Date().toISOString(),
    });
  });

  // ── Static files (production) ────────────────────────────
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  if (process.env.NODE_ENV === "production") {
    app.use(express.static(staticPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(staticPath, "index.html"));
    });
  }

  // ── Gestion des erreurs ───────────────────────────────────
  // Sentry doit être avant le handler d'erreurs custom
  if (process.env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logError("unhandled_http_error", err);
    res.status(500).json({
      error: "Erreur serveur.",
      code: "INTERNAL_SERVER_ERROR",
    });
  });

  const port = process.env.PORT || 3001;
  server.listen(Number(port), "0.0.0.0", () => {
    console.log(`\n🚀 BiblioTech API démarrée sur http://127.0.0.1:${port}`);
    console.log(`🤖 BibliAI: ${process.env.OPENROUTER_API_KEY ? "✅ Configuré" : "❌ Clé manquante"}`);
    console.log(`📡 Route chat: POST http://127.0.0.1:${port}/api/chat\n`);
  });
}

startServer().catch(console.error);
startBorrowCronJobs();
