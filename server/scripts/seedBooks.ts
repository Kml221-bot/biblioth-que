// ============================================================
// BiblioTech — Script de seed : importation de livres de test
// Usage : npx tsx server/scripts/seedBooks.ts
// ============================================================

import { config } from "dotenv";
config();

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// ─── 15 livres de test ────────────────────────────────────────
const BOOKS = [
  // ── Littérature Africaine & Sénégalaise ──
  {
    titre: "L'Aventure ambiguë",
    auteur: "Cheikh Hamidou Kane",
    categorie: "Littérature Africaine & Sénégalaise",
    sous_categorie: "Roman",
    description:
      "Chef-d'œuvre de la littérature africaine francophone, ce roman autobiographique raconte le déchirement d'un jeune Sénégalais tiraillé entre l'enseignement coranique de sa communauté et l'attraction de la culture occidentale.",
    isbn: "978-2-264-00234-1",
    editeur: "Julliard",
    annee_publication: 1961,
    pages_count: 191,
    langue: "Français",
    cover_url: "https://covers.openlibrary.org/b/isbn/9782264002341-L.jpg",
    read_url: "https://www.gutenberg.org/ebooks/search/?query=aventure+ambigue",
    prix_achat: 3500,
    prix_location: 500,
    prix_location_7j: 350,
    prix_location_30j: 900,
    type: "payant",
    type_acces: "borrow_or_buy",
    status: "publie",
    featured: true,
    note_moyenne: 4.8,
    nb_emprunts: 142,
    tags: ["roman", "identité", "éducation", "Sénégal", "classique africain"],
  },
  {
    titre: "Une si longue lettre",
    auteur: "Mariama Bâ",
    categorie: "Littérature Africaine & Sénégalaise",
    sous_categorie: "Roman épistolaire",
    description:
      "Roman épistolaire majeur de la littérature africaine, cette œuvre pionnière explore la condition des femmes sénégalaises à travers la correspondance entre deux amies après la mort du mari de l'une d'elles.",
    isbn: "978-2-708-70800-4",
    editeur: "Les Nouvelles Éditions Africaines",
    annee_publication: 1979,
    pages_count: 131,
    langue: "Français",
    cover_url: "https://covers.openlibrary.org/b/isbn/9782708708004-L.jpg",
    read_url: null,
    prix_achat: 3000,
    prix_location: 450,
    prix_location_7j: 300,
    prix_location_30j: 800,
    type: "payant",
    type_acces: "borrow_or_buy",
    status: "publie",
    featured: true,
    note_moyenne: 4.7,
    nb_emprunts: 189,
    tags: ["roman", "femme", "Sénégal", "polygamie", "féminisme"],
  },
  {
    titre: "Les Bouts de bois de Dieu",
    auteur: "Ousmane Sembène",
    categorie: "Littérature Africaine & Sénégalaise",
    sous_categorie: "Roman historique",
    description:
      "Fresque épique de la grève des cheminots du Dakar-Niger en 1947-1948. Un monument de la littérature africaine qui retrace la lutte des travailleurs sénégalais pour leurs droits.",
    isbn: "978-2-707-30046-6",
    editeur: "Presses Pocket",
    annee_publication: 1960,
    pages_count: 381,
    langue: "Français",
    cover_url: "https://covers.openlibrary.org/b/isbn/9782707300466-L.jpg",
    read_url: null,
    prix_achat: 4000,
    prix_location: 600,
    prix_location_7j: 400,
    prix_location_30j: 1000,
    type: "payant",
    type_acces: "borrow_or_buy",
    status: "publie",
    featured: false,
    note_moyenne: 4.6,
    nb_emprunts: 97,
    tags: ["roman", "grève", "colonialisme", "Sénégal", "travail", "historique"],
  },
  {
    titre: "La Grève des Bàttu",
    auteur: "Aminata Sow Fall",
    categorie: "Littérature Africaine & Sénégalaise",
    sous_categorie: "Roman",
    description:
      "Roman satirique sur la politique de mendicité en Afrique. Quand les mendiants de Dakar se mettent en grève, la société est bouleversée. Une critique acide des préjugés sociaux et des hypcrisies politiques.",
    isbn: "978-2-708-70133-3",
    editeur: "Les Nouvelles Éditions Africaines",
    annee_publication: 1979,
    pages_count: 181,
    langue: "Français",
    cover_url: "https://covers.openlibrary.org/b/isbn/9782708701333-L.jpg",
    read_url: null,
    prix_achat: 3000,
    prix_location: 450,
    prix_location_7j: 300,
    prix_location_30j: 800,
    type: "payant",
    type_acces: "borrow_or_buy",
    status: "publie",
    featured: false,
    note_moyenne: 4.4,
    nb_emprunts: 74,
    tags: ["roman", "mendicité", "société", "Dakar", "satire"],
  },

  // ── Informatique & Cybersécurité ──
  {
    titre: "Apprendre Python",
    auteur: "Yves Hillman",
    categorie: "Informatique & Cybersécurité",
    sous_categorie: "Programmation",
    description:
      "Guide complet d'apprentissage du langage Python, de l'installation aux projets avancés. Couvre les structures de données, la programmation orientée objet, les bibliothèques essentielles et les bonnes pratiques.",
    isbn: "978-2-409-04001-0",
    editeur: "ENI",
    annee_publication: 2023,
    pages_count: 480,
    langue: "Français",
    cover_url: "https://covers.openlibrary.org/b/isbn/9782409040010-L.jpg",
    read_url: null,
    prix_achat: 5500,
    prix_location: 800,
    prix_location_7j: 500,
    prix_location_30j: 1500,
    type: "payant",
    type_acces: "borrow_or_buy",
    status: "publie",
    featured: true,
    note_moyenne: 4.5,
    nb_emprunts: 203,
    tags: ["python", "programmation", "débutant", "informatique", "code"],
    filiere: "Informatique & Réseaux",
  },
  {
    titre: "Cybersécurité — Gérer les risques",
    auteur: "Laurent Bloch & Christophe Wolfhugel",
    categorie: "Informatique & Cybersécurité",
    sous_categorie: "Sécurité informatique",
    description:
      "Tour d'horizon complet de la cybersécurité moderne : menaces, attaques, défenses, cryptographie, gestion des risques. Un indispensable pour tout professionnel de l'IT confronté aux enjeux de sécurité.",
    isbn: "978-2-212-14249-3",
    editeur: "Eyrolles",
    annee_publication: 2022,
    pages_count: 398,
    langue: "Français",
    cover_url: "https://covers.openlibrary.org/b/isbn/9782212142493-L.jpg",
    read_url: null,
    prix_achat: 6000,
    prix_location: 900,
    prix_location_7j: 600,
    prix_location_30j: 1800,
    type: "payant",
    type_acces: "borrow_or_buy",
    status: "publie",
    featured: false,
    note_moyenne: 4.3,
    nb_emprunts: 88,
    tags: ["cybersécurité", "risques", "hacking", "RSSI", "protection"],
    filiere: "Informatique & Réseaux",
  },
  {
    titre: "Introduction aux algorithmes",
    auteur: "Thomas H. Cormen & al.",
    categorie: "Informatique & Cybersécurité",
    sous_categorie: "Algorithmique",
    description:
      "La référence mondiale en algorithmique. Couvre les structures de données, le tri, la recherche, les graphes, la programmation dynamique et les algorithmes distribués. Utilisé dans les meilleures universités du monde.",
    isbn: "978-2-100-06769-8",
    editeur: "Dunod",
    annee_publication: 2022,
    pages_count: 1296,
    langue: "Français",
    cover_url: "https://covers.openlibrary.org/b/isbn/9782100067698-L.jpg",
    read_url: null,
    prix_achat: 8500,
    prix_location: 1200,
    prix_location_7j: 800,
    prix_location_30j: 2500,
    type: "payant",
    type_acces: "borrow_or_buy",
    status: "publie",
    featured: true,
    note_moyenne: 4.9,
    nb_emprunts: 156,
    tags: ["algorithmes", "structures de données", "informatique", "université"],
    filiere: "Informatique & Réseaux",
  },

  // ── Développement Personnel ──
  {
    titre: "Les 7 habitudes des gens très efficaces",
    auteur: "Stephen R. Covey",
    categorie: "Développement Personnel",
    sous_categorie: "Productivité",
    description:
      "Un classique du développement personnel traduit en 40 langues. Covey propose une approche basée sur des principes universels pour transformer durablement ses habitudes personnelles et professionnelles.",
    isbn: "978-2-744-06315-4",
    editeur: "First Business",
    annee_publication: 2021,
    pages_count: 448,
    langue: "Français",
    cover_url: "https://covers.openlibrary.org/b/isbn/9782744063154-L.jpg",
    read_url: null,
    prix_achat: 4500,
    prix_location: 650,
    prix_location_7j: 450,
    prix_location_30j: 1200,
    type: "payant",
    type_acces: "borrow_or_buy",
    status: "publie",
    featured: true,
    note_moyenne: 4.6,
    nb_emprunts: 312,
    tags: ["habitudes", "efficacité", "leadership", "productivité", "best-seller"],
  },
  {
    titre: "L'Essentiel sur soi",
    auteur: "Pape Diallo",
    categorie: "Développement Personnel",
    sous_categorie: "Bien-être",
    description:
      "Un guide de développement personnel ancré dans les valeurs africaines. L'auteur sénégalais propose des outils pratiques pour cultiver la confiance en soi, gérer le stress et réussir ses projets en s'appuyant sur la sagesse ancestrale.",
    isbn: "978-2-919-23101-0",
    editeur: "Éditions L'Harmattan Sénégal",
    annee_publication: 2020,
    pages_count: 224,
    langue: "Français",
    cover_url: "https://covers.openlibrary.org/b/isbn/9782919231010-L.jpg",
    read_url: null,
    prix_achat: 3000,
    prix_location: 400,
    prix_location_7j: 250,
    prix_location_30j: 700,
    type: "payant",
    type_acces: "borrow_or_buy",
    status: "publie",
    featured: false,
    note_moyenne: 4.2,
    nb_emprunts: 45,
    tags: ["développement personnel", "Sénégal", "confiance", "Afrique", "bien-être"],
  },

  // ── Économie & Business ──
  {
    titre: "Père riche, Père pauvre",
    auteur: "Robert T. Kiyosaki",
    categorie: "Économie & Business",
    sous_categorie: "Finance personnelle",
    description:
      "Le livre de finance personnelle le plus vendu de tous les temps. Kiyosaki remet en question l'idée que la richesse passe par le travail salarié et enseigne à faire travailler l'argent pour soi grâce aux actifs et à l'investissement.",
    isbn: "978-2-709-61833-4",
    editeur: "Jai Lu",
    annee_publication: 2021,
    pages_count: 352,
    langue: "Français",
    cover_url: "https://covers.openlibrary.org/b/isbn/9782709618334-L.jpg",
    read_url: null,
    prix_achat: 4000,
    prix_location: 600,
    prix_location_7j: 400,
    prix_location_30j: 1100,
    type: "payant",
    type_acces: "borrow_or_buy",
    status: "publie",
    featured: true,
    note_moyenne: 4.4,
    nb_emprunts: 278,
    tags: ["finance", "investissement", "richesse", "business", "indépendance financière"],
  },
  {
    titre: "Entrepreneuriat en Afrique",
    auteur: "Martial Ze Belinga",
    categorie: "Économie & Business",
    sous_categorie: "Entrepreneuriat",
    description:
      "Un manuel pratique de l'entrepreneuriat adapté au contexte africain. De l'idée à la création, du financement à la croissance, l'auteur guide les entrepreneurs africains avec des exemples concrets issus du continent.",
    isbn: "978-2-343-17845-2",
    editeur: "L'Harmattan",
    annee_publication: 2019,
    pages_count: 280,
    langue: "Français",
    cover_url: "https://covers.openlibrary.org/b/isbn/9782343178452-L.jpg",
    read_url: null,
    prix_achat: 3500,
    prix_location: 500,
    prix_location_7j: 350,
    prix_location_30j: 950,
    type: "payant",
    type_acces: "borrow_or_buy",
    status: "publie",
    featured: false,
    note_moyenne: 4.1,
    nb_emprunts: 63,
    tags: ["entrepreneuriat", "Afrique", "startup", "business", "financement"],
  },

  // ── Manga & BD ──
  {
    titre: "Akira — Volume 1",
    auteur: "Katsuhiro Otomo",
    categorie: "Manga & BD",
    sous_categorie: "Manga seinen",
    description:
      "Chef-d'œuvre de la bande dessinée japonaise qui a révolutionné le manga mondial. Dans un Tokyo post-apocalyptique de 2019, Neo-Tokyo, deux amis d'enfance sont au cœur d'un complot gouvernemental mêlant pouvoirs psychiques et conspirations.",
    isbn: "978-2-723-41068-4",
    editeur: "Glénat",
    annee_publication: 2020,
    pages_count: 362,
    langue: "Français",
    cover_url: "https://covers.openlibrary.org/b/isbn/9782723410684-L.jpg",
    read_url: null,
    prix_achat: 5000,
    prix_location: 700,
    prix_location_7j: 500,
    prix_location_30j: 1300,
    type: "payant",
    type_acces: "borrow_or_buy",
    status: "publie",
    featured: true,
    note_moyenne: 4.9,
    nb_emprunts: 167,
    tags: ["manga", "science-fiction", "cyberpunk", "Japon", "classique"],
  },
  {
    titre: "Dragon Ball — Volume 1",
    auteur: "Akira Toriyama",
    categorie: "Manga & BD",
    sous_categorie: "Manga shōnen",
    description:
      "Le manga qui a défini une génération. Son Goku, enfant extraordinaire à la queue de singe, part à la recherche des 7 boules de cristal magiques capables d'exaucer tous les vœux. Aventures, combats et humour garantis.",
    isbn: "978-2-723-42120-8",
    editeur: "Glénat",
    annee_publication: 2023,
    pages_count: 192,
    langue: "Français",
    cover_url: "https://covers.openlibrary.org/b/isbn/9782723421208-L.jpg",
    read_url: null,
    prix_achat: 3000,
    prix_location: 400,
    prix_location_7j: 250,
    prix_location_30j: 750,
    type: "payant",
    type_acces: "borrow_or_buy",
    status: "publie",
    featured: false,
    note_moyenne: 4.8,
    nb_emprunts: 234,
    tags: ["manga", "aventure", "combat", "shōnen", "classique"],
  },

  // ── Droit & Sciences Politiques ──
  {
    titre: "Droit constitutionnel sénégalais",
    auteur: "Ismaïla Madior Fall",
    categorie: "Droit & Sciences Politiques",
    sous_categorie: "Droit public",
    description:
      "Référence universitaire incontournable sur le droit constitutionnel sénégalais. L'auteur, ancien Ministre de la Justice, analyse l'évolution de la Constitution de 2001 et les institutions de la République du Sénégal.",
    isbn: "978-2-343-12034-2",
    editeur: "L'Harmattan Sénégal",
    annee_publication: 2022,
    pages_count: 460,
    langue: "Français",
    cover_url: "https://covers.openlibrary.org/b/isbn/9782343120342-L.jpg",
    read_url: null,
    prix_achat: 6500,
    prix_location: 950,
    prix_location_7j: 650,
    prix_location_30j: 2000,
    type: "payant",
    type_acces: "borrow_or_buy",
    status: "publie",
    featured: false,
    note_moyenne: 4.3,
    nb_emprunts: 52,
    tags: ["droit", "constitution", "Sénégal", "institutions", "université"],
    filiere: "Droit & Sciences Politiques",
  },
];

// ─── Insertion ────────────────────────────────────────────────
async function seedBooks() {
  console.log(`\n📚 BiblioTech — Importation de ${BOOKS.length} livres de test\n`);

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Variables SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquantes dans .env");
    process.exit(1);
  }

  let inserted = 0;
  let skipped  = 0;
  let errors   = 0;

  for (const book of BOOKS) {
    // Vérifier si le livre existe déjà (par ISBN)
    const { data: existing } = await supabase
      .from("books")
      .select("id")
      .eq("isbn", book.isbn)
      .maybeSingle();

    if (existing) {
      console.log(`  ⏭  Déjà présent : "${book.titre}"`);
      skipped++;
      continue;
    }

    const { error } = await supabase.from("books").insert({
      titre:               book.titre,
      auteur:              book.auteur,
      categorie:           book.categorie,
      sous_categorie:      book.sous_categorie || null,
      description:         book.description,
      isbn:                book.isbn,
      editeur:             book.editeur,
      annee_publication:   book.annee_publication,
      pages_count:         book.pages_count,
      langue:              book.langue,
      cover_url:           null,    // Card générée automatiquement
      read_url:            book.read_url || null,
      prix_achat:          book.prix_achat,
      prix_location:       book.prix_location,
      prix_location_7j:    book.prix_location_7j,
      prix_location_30j:   book.prix_location_30j,
      type:                book.type,
      type_acces:          book.type_acces,
      status:              book.status,
      featured:            book.featured,
      note_moyenne:        book.note_moyenne,
      nb_emprunts:         book.nb_emprunts,
      tags:                book.tags,
      filiere:             book.filiere || null,
      nb_vues:             0,
    });

    if (error) {
      console.error(`  ❌ Erreur "${book.titre}" :`, error.message);
      errors++;
    } else {
      console.log(`  ✅ Importé : "${book.titre}" (${book.auteur})`);
      inserted++;
    }
  }

  console.log(`\n─────────────────────────────────────────`);
  console.log(`  ✅ Insérés   : ${inserted}`);
  console.log(`  ⏭  Ignorés   : ${skipped} (déjà présents)`);
  console.log(`  ❌ Erreurs   : ${errors}`);
  console.log(`─────────────────────────────────────────\n`);
}

seedBooks().catch(console.error);
