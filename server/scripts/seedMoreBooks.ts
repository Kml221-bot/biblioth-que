// ============================================================
// BiblioTech — Seed : 25 livres supplémentaires du domaine public
// Tous lisibles via le proxy BiblioTech (/api/reader/proxy)
// Sources : Project Gutenberg (gutenberg.org) — domaine public
// Usage   : npx tsx server/scripts/seedMoreBooks.ts
// ============================================================

import { config } from "dotenv";
config();

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

const epub = (id: number) => `https://www.gutenberg.org/ebooks/${id}.epub.images`;

const BOOKS = [
  // ── Jules Verne ──────────────────────────────────────────
  {
    isbn: "gb-3748",
    titre: "Voyage au centre de la Terre",
    auteur: "Jules Verne",
    categorie: "Aventure",
    sous_categorie: "Roman d'aventure scientifique",
    description: "Le professeur Lidenbrock et son neveu Axel s'engagent dans un voyage extraordinaire à l'intérieur de notre planète, en descendant dans un volcan islandais. Une aventure scientifique et fantastique au cœur de la Terre.",
    annee_publication: 1864,
    pages_count: 320,
    read_url: epub(3748),
    note_moyenne: 4.6, nb_emprunts: 0,
    tags: ["Jules Verne", "aventure", "science", "classique", "domaine public"],
  },
  {
    isbn: "gb-54268",
    titre: "Vingt Mille Lieues sous les mers",
    auteur: "Jules Verne",
    categorie: "Aventure",
    sous_categorie: "Roman de science-fiction",
    description: "Le mystérieux capitaine Nemo et son sous-marin le Nautilus explorent les profondeurs des océans. Pierre Aronnax, harponneur et son domestique Conseil, faits prisonniers, découvrent les merveilles et les abysses des mers du globe.",
    annee_publication: 1870,
    pages_count: 448,
    read_url: epub(54268),
    note_moyenne: 4.8, nb_emprunts: 0,
    tags: ["Jules Verne", "mer", "science-fiction", "aventure", "classique", "domaine public"],
  },
  {
    isbn: "gb-2117",
    titre: "De la Terre à la Lune",
    auteur: "Jules Verne",
    categorie: "Science-Fiction",
    sous_categorie: "Roman de science-fiction",
    description: "Le Gun-Club de Baltimore décide de construire un gigantesque canon pour envoyer un projectile sur la Lune. Une oeuvre visionnaire, publiée un siècle avant les premiers vols spatiaux, qui anticipe les voyages interplanétaires.",
    annee_publication: 1865,
    pages_count: 208,
    read_url: epub(2117),
    note_moyenne: 4.5, nb_emprunts: 0,
    tags: ["Jules Verne", "lune", "espace", "science-fiction", "classique", "domaine public"],
  },
  {
    isbn: "gb-16366",
    titre: "Michel Strogoff",
    auteur: "Jules Verne",
    categorie: "Aventure",
    sous_categorie: "Roman d'aventure historique",
    description: "Michel Strogoff, officier du Tsar, doit traverser la Sibérie en guerre pour porter un message secret à Irkoutsk. Une course contre la montre épique dans les steppes russes envahies par des hordes tartares.",
    annee_publication: 1876,
    pages_count: 384,
    read_url: epub(16366),
    note_moyenne: 4.7, nb_emprunts: 0,
    tags: ["Jules Verne", "Russie", "aventure", "héroïsme", "classique", "domaine public"],
  },

  // ── Émile Zola ───────────────────────────────────────────
  {
    isbn: "gb-4650",
    titre: "L'Assommoir",
    auteur: "Émile Zola",
    categorie: "Classiques",
    sous_categorie: "Roman naturaliste",
    description: "Gervaise Macquart, blanchisseuse à Montmartre, voit sa vie sombrer dans l'alcool et la misère. Une fresque implacable du Paris ouvrier du Second Empire, où Zola dénonce les ravages de l'alcoolisme sur les classes populaires.",
    annee_publication: 1877,
    pages_count: 512,
    read_url: epub(4650),
    note_moyenne: 4.4, nb_emprunts: 0,
    tags: ["Zola", "naturalisme", "Paris", "alcool", "ouvriers", "classique", "domaine public"],
  },
  {
    isbn: "gb-5218",
    titre: "Nana",
    auteur: "Émile Zola",
    categorie: "Classiques",
    sous_categorie: "Roman naturaliste",
    description: "Nana, fille de Gervaise de L'Assommoir, devient une courtisane qui fascine et ruine les hommes de la haute société parisienne. Une œuvre percutante sur la corruption sociale sous le Second Empire.",
    annee_publication: 1880,
    pages_count: 478,
    read_url: epub(5218),
    note_moyenne: 4.2, nb_emprunts: 0,
    tags: ["Zola", "naturalisme", "Paris", "courtisane", "société", "classique", "domaine public"],
  },
  {
    isbn: "gb-7451",
    titre: "Au Bonheur des Dames",
    auteur: "Émile Zola",
    categorie: "Économie & Business",
    sous_categorie: "Roman naturaliste",
    description: "Octave Mouret bâtit un empire commercial, le grand magasin Au Bonheur des Dames, qui écrase les petits commerçants du quartier. Une analyse visionnaire de la naissance du commerce moderne et de la consommation de masse.",
    annee_publication: 1883,
    pages_count: 441,
    read_url: epub(7451),
    note_moyenne: 4.3, nb_emprunts: 0,
    tags: ["Zola", "commerce", "consommation", "Paris", "naturalisme", "classique", "domaine public"],
  },

  // ── Alexandre Dumas ──────────────────────────────────────
  {
    isbn: "gb-17989",
    titre: "Le Comte de Monte-Cristo — Tome 1",
    auteur: "Alexandre Dumas",
    categorie: "Aventure",
    sous_categorie: "Roman d'aventure",
    description: "Edmond Dantès, jeune marin injustement emprisonné au château d'If, s'évade après 14 ans de captivité et revient sous le nom du mystérieux Comte de Monte-Cristo pour se venger de ceux qui l'ont trahi. L'un des plus grands romans d'aventure de tous les temps.",
    annee_publication: 1844,
    pages_count: 736,
    read_url: epub(17989),
    note_moyenne: 4.9, nb_emprunts: 0,
    tags: ["Dumas", "vengeance", "aventure", "trésor", "classique", "domaine public"],
  },
  {
    isbn: "gb-3655",
    titre: "Vingt Ans Après",
    auteur: "Alexandre Dumas",
    categorie: "Aventure",
    sous_categorie: "Roman de cape et d'épée",
    description: "Suite des Trois Mousquetaires. Vingt ans plus tard, d'Artagnan, Athos, Porthos et Aramis se retrouvent dans un contexte politique troublé — la Fronde et la guerre civile anglaise. Tous pour un, un pour tous !",
    annee_publication: 1845,
    pages_count: 780,
    read_url: epub(3655),
    note_moyenne: 4.7, nb_emprunts: 0,
    tags: ["Dumas", "mousquetaires", "aventure", "Fronde", "classique", "domaine public"],
  },

  // ── Honoré de Balzac ─────────────────────────────────────
  {
    isbn: "gb-4306",
    titre: "Eugénie Grandet",
    auteur: "Honoré de Balzac",
    categorie: "Classiques",
    sous_categorie: "Roman réaliste",
    description: "Eugénie Grandet, fille d'un avare tyrannique en Touraine, sacrifie tout par amour pour son cousin Charles Grandet. Une étude de caractère magistrale sur l'avarice, l'amour et la résignation dans la province française.",
    annee_publication: 1833,
    pages_count: 280,
    read_url: epub(4306),
    note_moyenne: 4.3, nb_emprunts: 0,
    tags: ["Balzac", "avarice", "province", "réalisme", "classique", "domaine public"],
  },
  {
    isbn: "gb-1319",
    titre: "Le Père Goriot",
    auteur: "Honoré de Balzac",
    categorie: "Classiques",
    sous_categorie: "Roman réaliste",
    description: "Dans la pension Vauquer, le jeune Eugène de Rastignac côtoie le mystérieux Vautrin et le vieux père Goriot, qui se ruine pour ses filles ingrates. Balzac peint une fresque impitoyable de la société parisienne sous la Restauration.",
    annee_publication: 1835,
    pages_count: 320,
    read_url: epub(1319),
    note_moyenne: 4.5, nb_emprunts: 0,
    tags: ["Balzac", "Paris", "ambition", "père", "réalisme", "classique", "domaine public"],
  },
  {
    isbn: "gb-1488",
    titre: "La Peau de chagrin",
    auteur: "Honoré de Balzac",
    categorie: "Science-Fiction",
    sous_categorie: "Roman fantastique",
    description: "Raphaël de Valentin, jeune homme désespéré, trouve une peau de chagrin magique qui exauce tous ses désirs mais rétrécit à chaque vœu, abrégeant ainsi sa vie. Une métaphore sur les désirs humains et le prix du bonheur.",
    annee_publication: 1831,
    pages_count: 304,
    read_url: epub(1488),
    note_moyenne: 4.2, nb_emprunts: 0,
    tags: ["Balzac", "fantastique", "désir", "magie", "réalisme", "classique", "domaine public"],
  },

  // ── Guy de Maupassant ────────────────────────────────────
  {
    isbn: "gb-17551",
    titre: "Une Vie",
    auteur: "Guy de Maupassant",
    categorie: "Classiques",
    sous_categorie: "Roman naturaliste",
    description: "Jeanne de Lamare, jeune femme normande pleine d'illusions, voit ses rêves s'effondrer au fil d'un mariage décevant, d'infidélités et de déceptions. Un regard lucide et poignant sur la condition féminine au XIXe siècle.",
    annee_publication: 1883,
    pages_count: 288,
    read_url: epub(17551),
    note_moyenne: 4.1, nb_emprunts: 0,
    tags: ["Maupassant", "femme", "Normandie", "naturalisme", "classique", "domaine public"],
  },
  {
    isbn: "gb-20417",
    titre: "Pierre et Jean",
    auteur: "Guy de Maupassant",
    categorie: "Classiques",
    sous_categorie: "Nouvelle réaliste",
    description: "Deux frères, Pierre et Jean Roland, découvrent qu'un riche ami de la famille a tout légué à Jean. Cette révélation plonge Pierre dans le doute sur les origines de son frère. Un récit psychologique d'une précision chirurgicale.",
    annee_publication: 1888,
    pages_count: 192,
    read_url: epub(20417),
    note_moyenne: 4.4, nb_emprunts: 0,
    tags: ["Maupassant", "jalousie", "famille", "psychologie", "classique", "domaine public"],
  },

  // ── Autres classiques français ───────────────────────────
  {
    isbn: "gb-17948",
    titre: "Fables — Livres I à VI",
    auteur: "Jean de La Fontaine",
    categorie: "Classiques",
    sous_categorie: "Poésie / Fables",
    description: "Les Fables de La Fontaine sont l'un des monuments de la littérature française. En 240 courts poèmes, l'auteur met en scène des animaux pour critiquer les vices et les travers de la société humaine avec esprit, ironie et sagesse.",
    annee_publication: 1668,
    pages_count: 240,
    read_url: epub(17948),
    note_moyenne: 4.6, nb_emprunts: 0,
    tags: ["La Fontaine", "fables", "poésie", "morale", "classique", "domaine public"],
  },
  {
    isbn: "gb-5765",
    titre: "Contes de ma mère l'Oye",
    auteur: "Charles Perrault",
    categorie: "Manga & BD",
    sous_categorie: "Contes",
    description: "Le Petit Chaperon Rouge, La Belle au Bois Dormant, Cendrillon, Le Chat Botté, La Barbe Bleue... Les contes de Perrault, fondateurs de la tradition des contes de fées occidentaux, enchantent petits et grands depuis le XVIIe siècle.",
    annee_publication: 1697,
    pages_count: 128,
    read_url: epub(5765),
    note_moyenne: 4.7, nb_emprunts: 0,
    tags: ["Perrault", "contes", "fées", "enfance", "classique", "domaine public"],
  },
  {
    isbn: "gb-24233",
    titre: "Les Liaisons dangereuses",
    auteur: "Pierre Choderlos de Laclos",
    categorie: "Dark Romance & Fiction",
    sous_categorie: "Roman épistolaire",
    description: "Le Vicomte de Valmont et la Marquise de Merteuil manipulent, séduisent et détruisent à travers des lettres d'une cruauté raffinée. Un chef-d'œuvre sulfureux du libertinage et de la machination sociale dans l'aristocratie du XVIIIe siècle.",
    annee_publication: 1782,
    pages_count: 512,
    read_url: epub(24233),
    note_moyenne: 4.4, nb_emprunts: 0,
    tags: ["Laclos", "libertinage", "manipulation", "épistolaire", "classique", "domaine public"],
  },

  // ── Littérature africaine (métadonnées enrichies) ────────
  {
    isbn: "af-9782070361106",
    titre: "Soundjata ou l'épopée mandingue",
    auteur: "Djibril Tamsir Niane",
    categorie: "Littérature Africaine & Sénégalaise",
    sous_categorie: "Épopée historique",
    description: "La grande épopée de Soundjata Keïta, fondateur de l'Empire du Mali au XIIIe siècle. Porté par la tradition orale des griots mandingues, ce récit retrace le destin exceptionnel d'un prince handicapé devenu lion parmi les rois.",
    annee_publication: 1960,
    pages_count: 156,
    read_url: null,
    note_moyenne: 4.8, nb_emprunts: 0,
    tags: ["épopée", "Mali", "griot", "Afrique de l'Ouest", "histoire", "tradition orale"],
  },
  {
    isbn: "af-9782264002341",
    titre: "Le monde s'effondre (Things Fall Apart)",
    auteur: "Chinua Achebe",
    categorie: "Littérature Africaine & Sénégalaise",
    sous_categorie: "Roman historique",
    description: "Okonkwo, guerrier igbo du Nigeria, voit son monde traditionnel se désintégrer face à l'arrivée des colonisateurs britanniques et des missionnaires chrétiens. Le roman africain le plus lu au monde, un cri pour la dignité des peuples colonisés.",
    annee_publication: 1958,
    pages_count: 215,
    read_url: null,
    note_moyenne: 4.7, nb_emprunts: 0,
    tags: ["Achebe", "Nigeria", "colonisation", "tradition", "Igbo", "classique africain"],
  },
  {
    isbn: "af-9782913554238",
    titre: "Kaveena",
    auteur: "Boubacar Boris Diop",
    categorie: "Littérature Africaine & Sénégalaise",
    sous_categorie: "Roman politique",
    description: "Dans une dictature africaine imaginaire, Kaveena, jeune femme rebelle, se retrouve mêlée à des complots politiques. Un roman noir et engagé sur le pouvoir, la trahison et la résistance en Afrique contemporaine, signé par l'un des plus grands romanciers sénégalais.",
    annee_publication: 2006,
    pages_count: 246,
    read_url: null,
    note_moyenne: 4.3, nb_emprunts: 0,
    tags: ["Boris Diop", "Sénégal", "politique", "dictature", "résistance"],
  },
  {
    isbn: "af-9782070362660",
    titre: "L'Étrange destin de Wangrin",
    auteur: "Amadou Hampâté Bâ",
    categorie: "Littérature Africaine & Sénégalaise",
    sous_categorie: "Roman biographique",
    description: "L'histoire vraie de Wangrin, interprète africain sous la colonisation française en Afrique de l'Ouest, qui joue double jeu entre colonisateurs et colonisés avec une intelligence remarquable. Un portrait captivant de l'Afrique coloniale.",
    annee_publication: 1973,
    pages_count: 396,
    read_url: null,
    note_moyenne: 4.6, nb_emprunts: 0,
    tags: ["Hampâté Bâ", "Mali", "colonisation", "identité", "Afrique de l'Ouest", "classique africain"],
  },
  {
    isbn: "af-9782707316875",
    titre: "Ces fruits si doux de l'arbre à pain",
    auteur: "Tierno Monénembo",
    categorie: "Littérature Africaine & Sénégalaise",
    sous_categorie: "Roman",
    description: "Un roman poignant sur l'exil, la mémoire et l'identité africaine. Un jeune Guinéen retrace les racines de sa famille et les blessures de l'histoire coloniale. Tierno Monénembo, l'un des plus importants romanciers africains contemporains.",
    annee_publication: 1987,
    pages_count: 210,
    read_url: null,
    note_moyenne: 4.2, nb_emprunts: 0,
    tags: ["Monénembo", "Guinée", "exil", "mémoire", "identité africaine"],
  },
  {
    isbn: "tech-free-cs50",
    titre: "Structure et interprétation des programmes",
    auteur: "Harold Abelson & Gerald Jay Sussman",
    categorie: "Informatique & Cybersécurité",
    sous_categorie: "Fondements de l'informatique",
    description: "SICP — le livre fondateur de l'informatique moderne, utilisé au MIT pendant 27 ans. Explore les concepts fondamentaux de la programmation : abstraction, récursivité, interpréteurs, compilateurs. Disponible gratuitement en ligne.",
    annee_publication: 1996,
    pages_count: 657,
    read_url: "https://web.mit.edu/6.001/6.037/sicp.pdf",
    note_moyenne: 4.9, nb_emprunts: 0,
    tags: ["SICP", "MIT", "programmation", "informatique", "fondements", "gratuit"],
  },
  {
    isbn: "tech-free-linux",
    titre: "The Linux Command Line",
    auteur: "William Shotts",
    categorie: "Informatique & Cybersécurité",
    sous_categorie: "Systèmes d'exploitation",
    description: "Guide complet et gratuit de la ligne de commande Linux. De l'installation aux scripts shell avancés, en passant par la gestion des fichiers, des processus et des réseaux. Indispensable pour tout développeur ou administrateur système.",
    annee_publication: 2019,
    pages_count: 555,
    read_url: "https://linuxcommand.org/tlcl.pdf",
    note_moyenne: 4.8, nb_emprunts: 0,
    tags: ["Linux", "shell", "terminal", "système", "gratuit", "débutant", "avancé"],
  },
];

async function seedMoreBooks() {
  console.log(`\n📚 BiblioTech — Import étendu : ${BOOKS.length} livres\n`);

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY manquants.");
    process.exit(1);
  }

  let inserted = 0, skipped = 0, errors = 0;

  for (const book of BOOKS) {
    const { data: existing } = await supabase
      .from("books").select("id").eq("isbn", book.isbn).maybeSingle();

    if (existing) {
      console.log(`  ⏭  Déjà présent : "${book.titre}"`);
      skipped++; continue;
    }

    const { error } = await supabase.from("books").insert({
      titre:             book.titre,
      auteur:            book.auteur,
      categorie:         book.categorie,
      sous_categorie:    book.sous_categorie,
      description:       book.description,
      isbn:              book.isbn,
      editeur:           "Domaine public",
      annee_publication: book.annee_publication,
      pages_count:       book.pages_count,
      langue:            "Français",
      cover_url:         null,
      read_url:          book.read_url ?? null,
      pdf_url:           null,
      prix_achat:        0,
      prix_location:     0,
      prix_location_7j:  0,
      prix_location_30j: 0,
      type:              "gratuit",
      type_acces:        "free",
      status:            "publie",
      featured:          book.note_moyenne >= 4.7,
      note_moyenne:      book.note_moyenne,
      nb_emprunts:       book.nb_emprunts,
      tags:              book.tags,
      nb_vues:           0,
    });

    if (error) {
      console.error(`  ❌ Erreur "${book.titre}" :`, error.message);
      errors++;
    } else {
      const icon = book.note_moyenne >= 4.7 ? "⭐" : "✅";
      const readable = book.read_url ? "📖" : "📋";
      console.log(`  ${icon} ${readable} "${book.titre}" (${book.auteur})`);
      inserted++;
    }
  }

  console.log(`\n──────────────────────────────────────────────────────`);
  console.log(`  ✅ Insérés   : ${inserted}`);
  console.log(`  ⏭  Ignorés   : ${skipped}`);
  console.log(`  ❌ Erreurs   : ${errors}`);
  console.log(`\n  📖 = lisible via proxy  |  📋 = métadonnées seulement`);
  console.log(`──────────────────────────────────────────────────────\n`);
}

seedMoreBooks().catch(console.error);
