// ============================================================
// BiblioTech — Seed chapitres de démonstration
// Ajoute 5 chapitres par livre (3 gratuits, 2 payants)
// Usage : npx tsx server/scripts/seedChapters.ts
// ============================================================

import { config } from "dotenv";
config();
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Chapitres génériques pour les livres sans chapitres
function generateChapters(bookTitle: string) {
  return [
    { ordre: 1, titre: "Introduction", is_free: true,  prix_pieces: 0,  description: `Découvrez "${bookTitle}" — gratuit` },
    { ordre: 2, titre: "Chapitre I",   is_free: true,  prix_pieces: 0,  description: "Premier chapitre" },
    { ordre: 3, titre: "Chapitre II",  is_free: true,  prix_pieces: 0,  description: "Deuxième chapitre" },
    { ordre: 4, titre: "Chapitre III", is_free: false, prix_pieces: 10, description: "Suite de l'histoire" },
    { ordre: 5, titre: "Chapitre IV",  is_free: false, prix_pieces: 10, description: "Vers le dénouement" },
  ];
}

async function seedChapters() {
  console.log("\n📖 BiblioTech — Seed chapitres\n");

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Variables manquantes");
    process.exit(1);
  }

  // Récupérer tous les livres
  const { data: books, error } = await supabase
    .from("books")
    .select("id, titre")
    .eq("status", "publie");

  if (error || !books) {
    console.error("❌ Erreur:", error?.message);
    process.exit(1);
  }

  console.log(`  📚 ${books.length} livres trouvés\n`);

  let inserted = 0, skipped = 0;

  for (const book of books) {
    // Vérifier si ce livre a déjà des chapitres
    const { count } = await supabase
      .from("chapters")
      .select("*", { count: "exact", head: true })
      .eq("book_id", book.id);

    if ((count ?? 0) > 0) {
      console.log(`  ⏭  "${book.titre}" — déjà ${count} chapitres`);
      skipped++;
      continue;
    }

    // Ajouter les chapitres
    const chapters = generateChapters(book.titre).map(ch => ({
      ...ch,
      book_id: book.id,
    }));

    const { error: insertErr } = await supabase
      .from("chapters")
      .insert(chapters);

    if (insertErr) {
      console.error(`  ❌ "${book.titre}": ${insertErr.message}`);
    } else {
      console.log(`  ✅ "${book.titre}" — 5 chapitres ajoutés (3 gratuits + 2 × 10🪙)`);
      inserted++;
    }
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`  ✅ Livres avec chapitres : ${inserted}`);
  console.log(`  ⏭  Ignorés (déjà OK)    : ${skipped}`);
  console.log(`─────────────────────────────────\n`);
}

seedChapters().catch(console.error);
