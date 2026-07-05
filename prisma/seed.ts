import { PrismaClient, SubscriptionPlan, UserRole, UserStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function seedBadges() {
  const badges = [
    {
      code: "FIRST_BORROW",
      nom: "Premier emprunt",
      description: "Ton premier pas dans la lecture numerique !",
      type: "reading",
    },
    {
      code: "BOOK_5",
      nom: "Lecteur assidu",
      description: "Tu as retourne 5 livres. Bravo !",
      type: "reading",
    },
    {
      code: "BOOK_10",
      nom: "Devoreur de livres",
      description: "10 livres lus et retournes.",
      type: "reading",
    },
    {
      code: "BOOK_25",
      nom: "Bibliothecaire",
      description: "25 livres retournes. Tu es une reference !",
      type: "reading",
    },
    {
      code: "BOOK_50",
      nom: "Maitre lecteur",
      description: "50 livres retournes. Legendaire !",
      type: "reading",
    },
    {
      code: "STREAK_7",
      nom: "Semaine de feu",
      description: "7 jours consecutifs de lecture.",
      type: "reading",
    },
    {
      code: "STREAK_30",
      nom: "Mois parfait",
      description: "30 jours consecutifs de lecture !",
      type: "reading",
    },
    {
      code: "CYBER_READER",
      nom: "Lecteur Cyber",
      description: "5 livres lus en Informatique & Cybersecurite.",
      type: "reading",
    },
    {
      code: "DEV_PERSO_FAN",
      nom: "Coach de soi",
      description: "5 livres lus en Developpement Personnel.",
      type: "reading",
    },
    {
      code: "LITTERATURE_AFRICAINE",
      nom: "Voix d'Afrique",
      description: "5 livres lus en Litterature Africaine.",
      type: "reading",
    },
    {
      code: "FIRST_REVIEW",
      nom: "Critique en herbe",
      description: "Tu as laisse ton premier avis sur un livre.",
      type: "community",
    },
    {
      code: "COMMUNITY_CREATOR",
      nom: "Leader",
      description: "Tu as cree ta premiere communaute.",
      type: "community",
    },
    {
      code: "FIRST_NOTE",
      nom: "Annotateur",
      description: "Tu as pris ta premiere note sur un livre.",
      type: "reading",
    },
    {
      code: "PREMIUM_MEMBER",
      nom: "Membre Premium",
      description: "Tu as souscrit a l'abonnement premium !",
      type: "loyalty",
    },
    {
      code: "REFERRAL_3",
      nom: "Ambassadeur",
      description: "Tu as parraine 3 amis sur BiblioTech.",
      type: "community",
    },
    {
      code: "NIGHT_OWL",
      nom: "Lecteur nocturne",
      description: "Tu as lu plus de 100 minutes en une seule session.",
      type: "loyalty",
    },
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      update: {
        nom: badge.nom,
        description: badge.description,
        type: badge.type,
      },
      create: badge,
    });
  }

  console.log(`  OK ${badges.length} badges crees/mis a jour`);
}

async function seedAdminProfile() {
  const adminEmail = "bibliotech61@gmail.com";
  const adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!adminUser) {
    console.warn(
      `  Admin ${adminEmail} absent. Cree d'abord ce compte dans Supabase Auth, puis relance le seed.`,
    );
    return;
  }

  await prisma.user.update({
    where: { id: adminUser.id },
    data: {
      nom: "Admin",
      prenom: "BiblioTech",
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      referralCode: "ADMIN001",
    },
  });

  await prisma.userStats.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      categoriesFavorites: [],
    },
  });

  const existingSubscription = await prisma.subscription.findFirst({
    where: {
      userId: adminUser.id,
      plan: SubscriptionPlan.PREMIUM,
      status: "active",
    },
    select: { id: true },
  });

  if (!existingSubscription) {
    await prisma.subscription.create({
      data: {
        userId: adminUser.id,
        plan: SubscriptionPlan.PREMIUM,
        status: "active",
        empruntsRestants: 999_999,
        autoRenew: true,
        startsAt: new Date(),
      },
    });
  }

  console.log(`  OK Admin: ${adminUser.email} (${adminUser.id})`);
}

async function seedBooks() {
  const demoBooks = [
    {
      titre: "Introduction a la Cybersecurite",
      auteur: "Abdoulaye Diop",
      categorie: "Informatique",
      filiere: "Informatique",
      description:
        "Guide complet de cybersecurite adapte au contexte africain. Couvre les fondamentaux de la securite des reseaux, la protection des donnees et les bonnes pratiques pour les entreprises senegalaises.",
      prixAchat: 5000,
      prixLocation7j: 500,
      prixLocation30j: 1500,
      typeAcces: "free",
      nombrePages: 280,
      langue: "fr",
      isbn: "978-2-1234-0001-0",
    },
    {
      titre: "Python pour les Debutants",
      auteur: "Fatou Sow",
      categorie: "Informatique",
      filiere: "Informatique",
      description:
        "Apprends Python pas a pas avec des exemples concrets tires du quotidien senegalais. Exercices pratiques et projets inclus.",
      prixAchat: 4000,
      prixLocation7j: 400,
      prixLocation30j: 1200,
      typeAcces: "free",
      nombrePages: 350,
      langue: "fr",
      isbn: "978-2-1234-0002-0",
    },
    {
      titre: "Le Pouvoir de la Discipline",
      auteur: "Moussa Ndiaye",
      categorie: "Developpement Personnel",
      description:
        "Comment developper la discipline au quotidien pour atteindre ses objectifs. Inspire des valeurs teranga et de la culture senegalaise.",
      prixAchat: 3500,
      prixLocation7j: 350,
      prixLocation30j: 1000,
      typeAcces: "free",
      nombrePages: 220,
      langue: "fr",
      isbn: "978-2-1234-0003-0",
    },
    {
      titre: "L'Aventure Ambigue",
      auteur: "Cheikh Hamidou Kane",
      categorie: "Litterature Africaine",
      description:
        "Roman classique de la litterature senegalaise. Le parcours de Samba Diallo entre tradition et modernite.",
      prixAchat: 2500,
      prixLocation7j: 250,
      prixLocation30j: 800,
      typeAcces: "free",
      nombrePages: 191,
      langue: "fr",
      isbn: "978-2-1234-0004-0",
    },
    {
      titre: "Reseaux Informatiques : Architecture et Protocoles",
      auteur: "Ibrahima Fall",
      categorie: "Informatique",
      filiere: "Informatique",
      description:
        "Manuel complet sur les reseaux TCP/IP, le modele OSI et les protocoles de communication. Ideal pour les etudiants en licence et master.",
      prixAchat: 6000,
      prixLocation7j: 600,
      prixLocation30j: 1800,
      typeAcces: "premium",
      nombrePages: 420,
      langue: "fr",
      isbn: "978-2-1234-0005-0",
    },
    {
      titre: "Droit des Affaires OHADA",
      auteur: "Aminata Diallo",
      categorie: "Droit",
      filiere: "Droit",
      description:
        "Le droit des affaires dans l'espace OHADA. Actes uniformes, societes commerciales, suretes et procedures collectives.",
      prixAchat: 5500,
      prixLocation7j: 550,
      prixLocation30j: 1600,
      typeAcces: "premium",
      nombrePages: 380,
      langue: "fr",
      isbn: "978-2-1234-0006-0",
    },
    {
      titre: "Anatomie Humaine Illustree",
      auteur: "Dr. Ousmane Ba",
      categorie: "Medecine",
      filiere: "Medecine",
      description:
        "Atlas d'anatomie humaine avec des illustrations detaillees. Reference pour les etudiants en premiere annee de medecine.",
      prixAchat: 8000,
      prixLocation7j: 800,
      prixLocation30j: 2500,
      typeAcces: "premium",
      nombrePages: 520,
      langue: "fr",
      isbn: "978-2-1234-0007-0",
    },
    {
      titre: "Economie du Senegal : Defis et Perspectives",
      auteur: "Pr. Mamadou Sarr",
      categorie: "Economie",
      filiere: "Economie",
      description:
        "Analyse approfondie de l'economie senegalaise post-2020. Politiques monetaires, commerce exterieur, et strategie d'emergence.",
      prixAchat: 4500,
      prixLocation7j: 450,
      prixLocation30j: 1300,
      typeAcces: "free",
      nombrePages: 310,
      langue: "fr",
      isbn: "978-2-1234-0008-0",
    },
  ];

  for (const book of demoBooks) {
    const existingBook = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM public.books WHERE isbn = ${book.isbn} LIMIT 1
    `;

    if (existingBook[0]) {
      await prisma.$executeRaw`
        UPDATE public.books
        SET titre = ${book.titre},
            auteur = ${book.auteur},
            categorie = ${book.categorie},
            sous_categorie = ${book.filiere ?? null},
            filiere = ${book.filiere ?? null},
            description = ${book.description},
            prix_achat = ${book.prixAchat},
            prix_location = ${book.prixLocation7j},
            prix_location_7j = ${book.prixLocation7j},
            prix_location_30j = ${book.prixLocation30j},
            type = ${book.typeAcces === "premium" ? "premium" : "gratuit"}::public.book_type,
            type_acces = ${book.typeAcces},
            status = 'publie'::public.book_status,
            pages_count = ${book.nombrePages},
            langue = ${book.langue},
            featured = false,
            note_moyenne = 0,
            nb_emprunts = 0,
            updated_at = now()
        WHERE id = ${existingBook[0].id}::uuid
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO public.books (
          titre,
          auteur,
          categorie,
          sous_categorie,
          filiere,
          description,
          prix_achat,
          prix_location,
          prix_location_7j,
          prix_location_30j,
          type,
          type_acces,
          status,
          pages_count,
          langue,
          isbn,
          tags,
          featured,
          note_moyenne,
          nb_emprunts
        )
        VALUES (
          ${book.titre},
          ${book.auteur},
          ${book.categorie},
          ${book.filiere ?? null},
          ${book.filiere ?? null},
          ${book.description},
          ${book.prixAchat},
          ${book.prixLocation7j},
          ${book.prixLocation7j},
          ${book.prixLocation30j},
          ${book.typeAcces === "premium" ? "premium" : "gratuit"}::public.book_type,
          ${book.typeAcces},
          'publie'::public.book_status,
          ${book.nombrePages},
          ${book.langue},
          ${book.isbn},
          ARRAY[${book.categorie}]::text[],
          false,
          0,
          0
        )
      `;
    }
  }

  console.log(`  OK ${demoBooks.length} livres de demo crees/mis a jour`);
}

async function main() {
  console.log("Seed BiblioTech - debut...");
  await seedBadges();
  await seedAdminProfile();
  console.log("  OK seed livres ignore. Ajoutez vos vrais PDF depuis l'admin catalogue.");
  console.log("Seed BiblioTech - termine.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
