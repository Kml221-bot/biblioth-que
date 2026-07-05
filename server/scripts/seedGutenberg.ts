// ============================================================
// BiblioTech — Seed Gutenberg : livres du domaine public
// Sources : Project Gutenberg (gutenberg.org) — 100% légal
// Usage   : npx tsx server/scripts/seedGutenberg.ts
//
// Tous ces livres sont en domaine public et lisibles directement
// via le proxy BiblioTech (/api/reader/proxy).
// ============================================================

import { config } from "dotenv";
config();

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// ─── URL helpers Gutenberg ─────────────────────────────────────
const gutenbergEpub   = (id: number) => `https://www.gutenberg.org/ebooks/${id}.epub.images`;
const gutenbergCover  = (id: number) => `https://www.gutenberg.org/cache/epub/${id}/pg${id}.cover.medium.jpg`;

// ─── 10 livres du domaine public avec EPUB lisibles ───────────
const GUTENBERG_BOOKS = [
  {
    gutenberg_id: 800,
    titre:        "Le Tour du monde en quatre-vingts jours",
    auteur:       "Jules Verne",
    categorie:    "Aventure",
    sous_categorie: "Roman d'aventure",
    description:  "Phileas Fogg, gentleman londonien excentrique, parie avec ses amis du Reform Club qu'il peut faire le tour du monde en 80 jours. Accompagné de son fidèle domestique Passepartout, il entame un voyage haletant à travers quatre continents.",
    isbn:         "978-2-070-36024-2",
    editeur:      "Project Gutenberg",
    annee_publication: 1872,
    pages_count:  256,
    langue:       "Français",
    tags:         ["aventure", "voyage", "Jules Verne", "classique", "domaine public"],
    prix_achat:   0, prix_location: 0, prix_location_7j: 0, prix_location_30j: 0,
    type:         "gratuit", type_acces: "free", featured: true, note_moyenne: 4.7, nb_emprunts: 0,
  },
  {
    gutenberg_id: 17489,
    titre:        "Les Misérables — Tome 1 : Fantine",
    auteur:       "Victor Hugo",
    categorie:    "Littérature Africaine & Sénégalaise",
    sous_categorie: "Roman classique",
    description:  "Fresque monumentale de la misère humaine dans la France du XIXe siècle. Jean Valjean, ancien forçat, tente de se racheter tandis que l'inspecteur Javert le pourchasse. Un monument de la littérature mondiale.",
    isbn:         "978-2-070-40440-6",
    editeur:      "Project Gutenberg",
    annee_publication: 1862,
    pages_count:  592,
    langue:       "Français",
    tags:         ["Victor Hugo", "classique", "misère", "justice", "domaine public", "XIXe"],
    prix_achat:   0, prix_location: 0, prix_location_7j: 0, prix_location_30j: 0,
    type:         "gratuit", type_acces: "free", featured: true, note_moyenne: 4.9, nb_emprunts: 0,
  },
  {
    gutenberg_id: 5711,
    titre:        "Germinal",
    auteur:       "Émile Zola",
    categorie:    "Développement Personnel",
    sous_categorie: "Roman naturaliste",
    description:  "Chef-d'œuvre du naturalisme, Germinal décrit la dure vie des mineurs du Nord de la France et leur grève épique. Une œuvre puissante sur la condition ouvrière, la solidarité et la lutte pour la dignité.",
    isbn:         "978-2-070-40327-0",
    editeur:      "Project Gutenberg",
    annee_publication: 1885,
    pages_count:  591,
    langue:       "Français",
    tags:         ["Zola", "naturalisme", "mines", "grève", "classique", "domaine public"],
    prix_achat:   0, prix_location: 0, prix_location_7j: 0, prix_location_30j: 0,
    type:         "gratuit", type_acces: "free", featured: false, note_moyenne: 4.6, nb_emprunts: 0,
  },
  {
    gutenberg_id: 19942,
    titre:        "Candide ou l'Optimisme",
    auteur:       "Voltaire",
    categorie:    "Développement Personnel",
    sous_categorie: "Conte philosophique",
    description:  "Conte philosophique satirique par excellence. Candide, jeune homme naïf élevé dans l'optimisme de Leibniz, traverse les pires aventures à travers le monde et finit par conclure qu'il faut cultiver son jardin.",
    isbn:         "978-2-070-36043-3",
    editeur:      "Project Gutenberg",
    annee_publication: 1759,
    pages_count:  128,
    langue:       "Français",
    tags:         ["Voltaire", "philosophie", "satire", "Lumières", "classique", "domaine public"],
    prix_achat:   0, prix_location: 0, prix_location_7j: 0, prix_location_30j: 0,
    type:         "gratuit", type_acces: "free", featured: false, note_moyenne: 4.5, nb_emprunts: 0,
  },
  {
    gutenberg_id: 2413,
    titre:        "Madame Bovary",
    auteur:       "Gustave Flaubert",
    categorie:    "Dark Romance & Fiction",
    sous_categorie: "Roman réaliste",
    description:  "Emma Bovary, femme de médecin normand, rêve d'une vie romantique et aventureuse. Sa quête désespérée du bonheur idéalisé la mène à l'adultère et à la ruine. Chef-d'œuvre du réalisme français.",
    isbn:         "978-2-070-36028-0",
    editeur:      "Project Gutenberg",
    annee_publication: 1857,
    pages_count:  480,
    langue:       "Français",
    tags:         ["Flaubert", "réalisme", "romance", "classique", "domaine public", "XIXe"],
    prix_achat:   0, prix_location: 0, prix_location_7j: 0, prix_location_30j: 0,
    type:         "gratuit", type_acces: "free", featured: false, note_moyenne: 4.4, nb_emprunts: 0,
  },
  {
    gutenberg_id: 798,
    titre:        "Le Rouge et le Noir",
    auteur:       "Stendhal",
    categorie:    "Dark Romance & Fiction",
    sous_categorie: "Roman psychologique",
    description:  "Julien Sorel, fils de charpentier ambitieux, tente d'escalader les échelons de la société en séduisant les femmes de ses maîtres. Une analyse magistrale de l'ambition, de l'hypocrisie et de la passion.",
    isbn:         "978-2-070-36079-2",
    editeur:      "Project Gutenberg",
    annee_publication: 1830,
    pages_count:  576,
    langue:       "Français",
    tags:         ["Stendhal", "ambition", "romance", "classique", "domaine public", "XIXe"],
    prix_achat:   0, prix_location: 0, prix_location_7j: 0, prix_location_30j: 0,
    type:         "gratuit", type_acces: "free", featured: false, note_moyenne: 4.3, nb_emprunts: 0,
  },
  {
    gutenberg_id: 19657,
    titre:        "Notre-Dame de Paris",
    auteur:       "Victor Hugo",
    categorie:    "Aventure",
    sous_categorie: "Roman historique",
    description:  "Dans le Paris médiéval, l'archidiacre Frollo et le sonneur de cloches bossu Quasimodo sont tous deux épris de la belle gitane Esmeralda. Un roman épique sur la beauté, la monstruosité et la passion.",
    isbn:         "978-2-070-36001-3",
    editeur:      "Project Gutenberg",
    annee_publication: 1831,
    pages_count:  640,
    langue:       "Français",
    tags:         ["Victor Hugo", "Moyen Âge", "cathédrale", "classique", "domaine public"],
    prix_achat:   0, prix_location: 0, prix_location_7j: 0, prix_location_30j: 0,
    type:         "gratuit", type_acces: "free", featured: true, note_moyenne: 4.5, nb_emprunts: 0,
  },
  {
    gutenberg_id: 13951,
    titre:        "Les Trois Mousquetaires",
    auteur:       "Alexandre Dumas",
    categorie:    "Aventure",
    sous_categorie: "Roman d'aventure historique",
    description:  "D'Artagnan, jeune Gascon, monte à Paris et se lie d'amitié avec Athos, Porthos et Aramis. Ensemble, ils déjouent les intrigues du Cardinal de Richelieu. Tous pour un, un pour tous !",
    isbn:         "978-2-070-40858-9",
    editeur:      "Project Gutenberg",
    annee_publication: 1844,
    pages_count:  704,
    langue:       "Français",
    tags:         ["Dumas", "mousquetaires", "aventure", "classique", "domaine public", "XVIIe"],
    prix_achat:   0, prix_location: 0, prix_location_7j: 0, prix_location_30j: 0,
    type:         "gratuit", type_acces: "free", featured: true, note_moyenne: 4.8, nb_emprunts: 0,
  },
  {
    gutenberg_id: 44681,
    titre:        "Bel-Ami",
    auteur:       "Guy de Maupassant",
    categorie:    "Économie & Business",
    sous_categorie: "Roman naturaliste",
    description:  "Georges Duroy, beau et sans scrupule, gravit les échelons du journalisme parisien en manipulant femmes et hommes influents. Un portrait acerbe de l'opportunisme et de la corruption dans la presse.",
    isbn:         "978-2-070-36002-0",
    editeur:      "Project Gutenberg",
    annee_publication: 1885,
    pages_count:  384,
    langue:       "Français",
    tags:         ["Maupassant", "journalisme", "ambition", "naturalisme", "classique", "domaine public"],
    prix_achat:   0, prix_location: 0, prix_location_7j: 0, prix_location_30j: 0,
    type:         "gratuit", type_acces: "free", featured: false, note_moyenne: 4.2, nb_emprunts: 0,
  },
  {
    gutenberg_id: 6099,
    titre:        "Les Fleurs du mal",
    auteur:       "Charles Baudelaire",
    categorie:    "Littérature Africaine & Sénégalaise",
    sous_categorie: "Poésie",
    description:  "Recueil poétique majeur de la littérature française. Baudelaire explore les gouffres de l'âme humaine — beauté, péché, mort, idéal — dans des vers d'une perfection formelle absolue qui révolutionnèrent la poésie moderne.",
    isbn:         "978-2-070-36025-9",
    editeur:      "Project Gutenberg",
    annee_publication: 1857,
    pages_count:  320,
    langue:       "Français",
    tags:         ["Baudelaire", "poésie", "symbolisme", "classique", "domaine public"],
    prix_achat:   0, prix_location: 0, prix_location_7j: 0, prix_location_30j: 0,
    type:         "gratuit", type_acces: "free", featured: false, note_moyenne: 4.6, nb_emprunts: 0,
  },
];

// ─── Insertion ────────────────────────────────────────────────
async function seedGutenberg() {
  console.log(`\n📚 BiblioTech — Import Gutenberg : ${GUTENBERG_BOOKS.length} classiques du domaine public\n`);

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Variables SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquantes.");
    process.exit(1);
  }

  let inserted = 0, skipped = 0, errors = 0;

  for (const book of GUTENBERG_BOOKS) {
    // Vérifier doublon par ISBN
    const { data: existing } = await supabase
      .from("books").select("id").eq("isbn", book.isbn).maybeSingle();

    if (existing) {
      console.log(`  ⏭  Déjà présent : "${book.titre}"`);
      skipped++; continue;
    }

    const readUrl = gutenbergEpub(book.gutenberg_id);

    const { error } = await supabase.from("books").insert({
      titre:               book.titre,
      auteur:              book.auteur,
      categorie:           book.categorie,
      sous_categorie:      book.sous_categorie,
      description:         book.description,
      isbn:                book.isbn,
      editeur:             book.editeur,
      annee_publication:   book.annee_publication,
      pages_count:         book.pages_count,
      langue:              book.langue,
      cover_url:           null,        // Card générée automatiquement par BiblioTech
      read_url:            readUrl,     // EPUB direct via proxy
      prix_achat:          book.prix_achat,
      prix_location:       book.prix_location,
      prix_location_7j:    book.prix_location_7j,
      prix_location_30j:   book.prix_location_30j,
      type:                book.type,
      type_acces:          book.type_acces,
      status:              "publie",
      featured:            book.featured,
      note_moyenne:        book.note_moyenne,
      nb_emprunts:         book.nb_emprunts,
      tags:                book.tags,
      nb_vues:             0,
    });

    if (error) {
      console.error(`  ❌ Erreur "${book.titre}" :`, error.message);
      errors++;
    } else {
      const icon = book.featured ? "⭐" : "✅";
      console.log(`  ${icon} Importé : "${book.titre}" (Gutenberg #${book.gutenberg_id})`);
      inserted++;
    }
  }

  console.log(`\n─────────────────────────────────────────────────`);
  console.log(`  ✅ Insérés   : ${inserted}`);
  console.log(`  ⏭  Ignorés   : ${skipped}`);
  console.log(`  ❌ Erreurs   : ${errors}`);
  console.log(`\n  💡 Les livres sont lisibles via le proxy BiblioTech.`);
  console.log(`     Assure-toi que "gutenberg.org" est dans READER_PROXY_ALLOWED_HOSTS`);
  console.log(`─────────────────────────────────────────────────\n`);
}

seedGutenberg().catch(console.error);
