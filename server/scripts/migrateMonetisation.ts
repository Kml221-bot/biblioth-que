// ============================================================
// BiblioTech — Migration monétisation
// Ajoute les tables chapters, user_chapter_accesses,
// coin_transactions + colonnes coin_balance, free_chapters_count
// Usage : npx tsx server/scripts/migrateMonetisation.ts
// ============================================================

import { config } from "dotenv";
config();

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run(label: string, sql: string) {
  process.stdout.write(`  ⏳ ${label}...`);
  const { error } = await supabase.rpc("exec_sql", { sql }).single();
  // La fonction exec_sql n'existe pas toujours — on passe par l'API REST
  if (error && !error.message.includes("already exists") && !error.message.includes("does not exist")) {
    process.stdout.write(` ❌\n`);
    console.error(`     ${error.message}`);
    return false;
  }
  process.stdout.write(` ✅\n`);
  return true;
}

async function migrate() {
  console.log("\n🔧 BiblioTech — Migration monétisation\n");

  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !key) {
    console.error("❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env");
    process.exit(1);
  }

  const statements = [
    {
      label: "Enum coin_transaction_type",
      sql: `DO $$ BEGIN
        CREATE TYPE public.coin_transaction_type AS ENUM ('purchase','unlock','bonus','refund');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
    },
    {
      label: "Colonne profiles.coin_balance",
      sql: `ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coin_balance INTEGER NOT NULL DEFAULT 0;`,
    },
    {
      label: "Colonne books.free_chapters_count",
      sql: `ALTER TABLE public.books ADD COLUMN IF NOT EXISTS free_chapters_count INTEGER NOT NULL DEFAULT 3;`,
    },
    {
      label: "Table chapters",
      sql: `CREATE TABLE IF NOT EXISTS public.chapters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
        titre TEXT NOT NULL,
        ordre INTEGER NOT NULL,
        is_free BOOLEAN NOT NULL DEFAULT false,
        prix_pieces INTEGER NOT NULL DEFAULT 0,
        content_url TEXT,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (book_id, ordre)
      );`,
    },
    {
      label: "Index chapters_book_id_idx",
      sql: `CREATE INDEX IF NOT EXISTS chapters_book_id_idx ON public.chapters(book_id);`,
    },
    {
      label: "Table user_chapter_accesses",
      sql: `CREATE TABLE IF NOT EXISTS public.user_chapter_accesses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
        paid_pieces INTEGER NOT NULL DEFAULT 0,
        unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, chapter_id)
      );`,
    },
    {
      label: "Index uca_user_id_idx",
      sql: `CREATE INDEX IF NOT EXISTS uca_user_id_idx ON public.user_chapter_accesses(user_id);`,
    },
    {
      label: "Table coin_transactions",
      sql: `CREATE TABLE IF NOT EXISTS public.coin_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        type public.coin_transaction_type NOT NULL,
        amount INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        description TEXT,
        chapter_id UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );`,
    },
    {
      label: "Index ct_user_created_idx",
      sql: `CREATE INDEX IF NOT EXISTS ct_user_created_idx ON public.coin_transactions(user_id, created_at);`,
    },
  ];

  // Exécuter via l'API REST de Supabase (endpoint /rest/v1/rpc ou query directe)
  for (const stmt of statements) {
    process.stdout.write(`  ⏳ ${stmt.label}...`);
    try {
      const res = await fetch(`${url}/rest/v1/rpc/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          apikey: key,
        },
        body: JSON.stringify({ query: stmt.sql }),
      });

      if (res.ok) {
        process.stdout.write(` ✅\n`);
        continue;
      }

      // Fallback : essayer via pg direct si DATABASE_URL disponible
      const text = await res.text();
      if (text.includes("already exists") || text.includes("duplicate")) {
        process.stdout.write(` ⏭  (déjà existe)\n`);
      } else {
        process.stdout.write(` ⚠️  (API REST indisponible, essai Prisma...)\n`);
        await runViaPrisma(stmt.sql, stmt.label);
      }
    } catch (e) {
      process.stdout.write(` ❌ ${(e as Error).message}\n`);
    }
  }

  console.log("\n✅ Migration terminée.\n");
}

async function runViaPrisma(sql: string, label: string) {
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log(`     ✅ ${label} (via Prisma)`);
  } catch (e: any) {
    if (e.message?.includes("already exists") || e.message?.includes("duplicate")) {
      console.log(`     ⏭  ${label} (déjà existe)`);
    } else {
      console.error(`     ❌ ${label}: ${e.message}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

migrate().catch(console.error);
