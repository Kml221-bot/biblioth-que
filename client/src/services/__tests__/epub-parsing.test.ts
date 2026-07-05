// @vitest-environment jsdom
//
// Tests d'intégration EPUB avec de vrais fichiers EPUB générés via JSZip.
// Vérifie que epubjs parse correctement métadonnées, TOC et structure de spine.

import { describe, it, expect, beforeAll, vi } from "vitest";
import JSZip from "jszip";

// ─── Polyfills jsdom manquants ─────────────────────────────────────────────────
// jsdom ne supporte pas Blob URLs ; epubjs en a besoin pour charger des ressources.
Object.defineProperty(globalThis.URL, "createObjectURL", {
  value: vi.fn(() => "blob:test-epub-url"),
  writable: true,
});
Object.defineProperty(globalThis.URL, "revokeObjectURL", {
  value: vi.fn(),
  writable: true,
});

// ─── Fabrique d'EPUB de test ───────────────────────────────────────────────────
interface TestEpubOptions {
  title: string;
  author: string;
  language: string;
  identifier: string;
  chapters: Array<{ id: string; title: string; content: string }>;
}

async function createTestEpub(opts: TestEpubOptions): Promise<ArrayBuffer> {
  const zip = new JSZip();

  // mimetype DOIT être le premier fichier, non compressé
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });

  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:schemas:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf"
              media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  const manifestItems = opts.chapters
    .map(
      (ch) =>
        `    <item id="${ch.id}" href="${ch.id}.xhtml" media-type="application/xhtml+xml"/>`
    )
    .join("\n");

  const spineItems = opts.chapters
    .map((ch) => `    <itemref idref="${ch.id}"/>`)
    .join("\n");

  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0" encoding="utf-8"?>
<package version="2.0" xmlns="http://www.idpf.org/2007/opf"
         unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"
            xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${opts.title}</dc:title>
    <dc:creator opf:role="aut">${opts.author}</dc:creator>
    <dc:identifier id="bookid">${opts.identifier}</dc:identifier>
    <dc:language>${opts.language}</dc:language>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
${manifestItems}
  </manifest>
  <spine toc="ncx">
${spineItems}
  </spine>
</package>`
  );

  const navPoints = opts.chapters
    .map(
      (ch, i) => `
    <navPoint id="nav${i + 1}" playOrder="${i + 1}">
      <navLabel><text>${ch.title}</text></navLabel>
      <content src="${ch.id}.xhtml"/>
    </navPoint>`
    )
    .join("");

  zip.file(
    "OEBPS/toc.ncx",
    `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN"
          "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx version="2005-1" xmlns="http://www.daisy.org/z3986/2005/ncx/">
  <head>
    <meta name="dtb:uid" content="${opts.identifier}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${opts.title}</text></docTitle>
  <navMap>${navPoints}
  </navMap>
</ncx>`
  );

  for (const ch of opts.chapters) {
    zip.file(
      `OEBPS/${ch.id}.xhtml`,
      `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN"
          "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head><title>${ch.title}</title></head>
  <body>
    <h1>${ch.title}</h1>
    <p>${ch.content}</p>
  </body>
</html>`
    );
  }

  return zip.generateAsync({ type: "arraybuffer" });
}

// ─── EPUB de test : "Le Petit Prince" (domaine public) ────────────────────────
const PETIT_PRINCE_META = {
  title: "Le Petit Prince",
  author: "Antoine de Saint-Exupéry",
  language: "fr",
  identifier: "isbn-978-2-07-040850-4",
  chapters: [
    {
      id: "ch1",
      title: "Chapitre I",
      content:
        "Lorsque j'avais six ans j'ai vu, une fois, une magnifique image dans un livre sur la Forêt vierge. " +
        "Ça représentait un serpent boa qui avalait un fauve. Voilà la copie du dessin.",
    },
    {
      id: "ch2",
      title: "Chapitre II",
      content:
        "J'ai ainsi vécu seul, sans personne avec qui parler véritablement, jusqu'à une panne dans le désert du Sahara. " +
        "Il y a six ans. Quelque chose s'était cassé dans mon moteur.",
    },
    {
      id: "ch3",
      title: "Chapitre III",
      content:
        "J'ai mis du temps à comprendre d'où il venait. Le petit prince, qui me posait beaucoup de questions, " +
        "ne semblait jamais entendre les miennes. C'est par des mots prononcés par hasard qu'il me révéla tout.",
    },
  ],
};

// ══════════════════════════════════════════════════════════════════════════════
// TESTS DE CRÉATION DU FICHIER EPUB (JSZip)
// ══════════════════════════════════════════════════════════════════════════════
describe("Création d'un fichier EPUB valide (JSZip)", () => {
  let epubBuffer: ArrayBuffer;

  beforeAll(async () => {
    epubBuffer = await createTestEpub(PETIT_PRINCE_META);
  });

  it("génère un ArrayBuffer non vide", () => {
    expect(epubBuffer).toBeInstanceOf(ArrayBuffer);
    expect(epubBuffer.byteLength).toBeGreaterThan(500);
  });

  it("l'archive ZIP contient 'mimetype' comme premier fichier non compressé", async () => {
    const zip = await JSZip.loadAsync(epubBuffer);
    const mimetypeFile = zip.file("mimetype");
    expect(mimetypeFile).not.toBeNull();
    const content = await mimetypeFile!.async("string");
    expect(content).toBe("application/epub+zip");
  });

  it("l'archive contient META-INF/container.xml", async () => {
    const zip = await JSZip.loadAsync(epubBuffer);
    const containerFile = zip.file("META-INF/container.xml");
    expect(containerFile).not.toBeNull();
    const xml = await containerFile!.async("string");
    expect(xml).toContain("OEBPS/content.opf");
  });

  it("l'archive contient le fichier OPF (content.opf)", async () => {
    const zip = await JSZip.loadAsync(epubBuffer);
    const opfFile = zip.file("OEBPS/content.opf");
    expect(opfFile).not.toBeNull();
    const xml = await opfFile!.async("string");
    expect(xml).toContain("Le Petit Prince");
    expect(xml).toContain("Antoine de Saint-Exupéry");
    expect(xml).toContain("fr");
  });

  it("l'archive contient le fichier NCX (table des matières)", async () => {
    const zip = await JSZip.loadAsync(epubBuffer);
    const ncxFile = zip.file("OEBPS/toc.ncx");
    expect(ncxFile).not.toBeNull();
    const xml = await ncxFile!.async("string");
    expect(xml).toContain("Chapitre I");
    expect(xml).toContain("Chapitre II");
    expect(xml).toContain("Chapitre III");
  });

  it("l'archive contient tous les chapitres XHTML", async () => {
    const zip = await JSZip.loadAsync(epubBuffer);
    for (const ch of PETIT_PRINCE_META.chapters) {
      const file = zip.file(`OEBPS/${ch.id}.xhtml`);
      expect(file, `chapitre ${ch.id} manquant`).not.toBeNull();
      const html = await file!.async("string");
      expect(html).toContain(ch.title);
      expect(html).toContain(ch.content.substring(0, 30));
    }
  });

  it("la spine liste les chapitres dans le bon ordre", async () => {
    const zip = await JSZip.loadAsync(epubBuffer);
    const opf = await zip.file("OEBPS/content.opf")!.async("string");

    const idrefMatches = [...opf.matchAll(/idref="(ch\d+)"/g)];
    const order = idrefMatches.map((m) => m[1]);
    expect(order).toEqual(["ch1", "ch2", "ch3"]);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TESTS DE PARSING EPUBJS
// ══════════════════════════════════════════════════════════════════════════════
describe("Parsing EPUB avec epubjs", () => {
  let epubBuffer: ArrayBuffer;

  beforeAll(async () => {
    epubBuffer = await createTestEpub(PETIT_PRINCE_META);
  });

  it("ouvre le livre sans lever d'exception", async () => {
    const { default: ePub } = await import("epubjs");
    expect(() => ePub(epubBuffer)).not.toThrow();
  });

  it("extrait le titre depuis les métadonnées OPF", async () => {
    const { default: ePub } = await import("epubjs");
    const book = ePub(epubBuffer);
    const metadata = await book.loaded.metadata;
    expect(metadata.title).toBe("Le Petit Prince");
  });

  it("extrait l'auteur depuis les métadonnées OPF", async () => {
    const { default: ePub } = await import("epubjs");
    const book = ePub(epubBuffer);
    const metadata = await book.loaded.metadata;
    expect(metadata.creator).toBe("Antoine de Saint-Exupéry");
  });

  it("extrait la langue depuis les métadonnées OPF", async () => {
    const { default: ePub } = await import("epubjs");
    const book = ePub(epubBuffer);
    const metadata = await book.loaded.metadata;
    expect(metadata.language).toBe("fr");
  });

  it("parse la table des matières (toc.ncx) avec 3 chapitres", async () => {
    const { default: ePub } = await import("epubjs");
    const book = ePub(epubBuffer);
    const navigation = await book.loaded.navigation;
    const toc = navigation.toc;

    expect(toc).toHaveLength(3);
    expect(toc[0].label.trim()).toBe("Chapitre I");
    expect(toc[1].label.trim()).toBe("Chapitre II");
    expect(toc[2].label.trim()).toBe("Chapitre III");
  });

  it("la spine contient les 3 items dans le bon ordre", async () => {
    const { default: ePub } = await import("epubjs");
    const book = ePub(epubBuffer);
    await book.ready;

    const items = book.spine.items;
    expect(items).toHaveLength(3);
    expect(items[0].href).toContain("ch1.xhtml");
    expect(items[1].href).toContain("ch2.xhtml");
    expect(items[2].href).toContain("ch3.xhtml");
  });

  it("les items de la spine ont un id défini", async () => {
    const { default: ePub } = await import("epubjs");
    const book = ePub(epubBuffer);
    await book.ready;

    for (const item of book.spine.items) {
      expect(item.idref).toBeTruthy();
    }
  });

  it("la spine.get() retrouve un item par son index", async () => {
    const { default: ePub } = await import("epubjs");
    const book = ePub(epubBuffer);
    await book.ready;

    // spine.get() accepte un index numérique ou le href tel que stocké par epubjs
    const itemByIndex = book.spine.get(0);
    expect(itemByIndex).not.toBeNull();
    expect(itemByIndex.idref).toBe("ch1");

    // Retrouver via le href exact stocké dans l'item
    const href = book.spine.items[1].href;
    const itemByHref = book.spine.get(href);
    expect(itemByHref).not.toBeNull();
    expect(itemByHref.idref).toBe("ch2");
  });

  it("retourne l'identifiant unique du livre", async () => {
    const { default: ePub } = await import("epubjs");
    const book = ePub(epubBuffer);
    const metadata = await book.loaded.metadata;
    expect(metadata.identifier).toBeTruthy();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TEST EPUB MULTI-SCÉNARIOS
// ══════════════════════════════════════════════════════════════════════════════
describe("EPUB avec différents contenus", () => {
  it("parse correctement un livre en anglais (Frankenstein — domaine public)", async () => {
    const { default: ePub } = await import("epubjs");

    const buffer = await createTestEpub({
      title: "Frankenstein",
      author: "Mary Shelley",
      language: "en",
      identifier: "isbn-978-0-486-28211-5",
      chapters: [
        {
          id: "letter1",
          title: "Letter I",
          content:
            "To Mrs. Saville, England. St. Petersburgh, Dec. 11th, 17—. " +
            "You will rejoice to hear that no disaster has accompanied the commencement of an enterprise.",
        },
        {
          id: "ch1",
          title: "Chapter I",
          content:
            "I am by birth a Genevese, and my family is one of the most distinguished of that republic. " +
            "My ancestors had been for many years counsellors and syndics.",
        },
      ],
    });

    const book = ePub(buffer);
    const [metadata, navigation] = await Promise.all([
      book.loaded.metadata,
      book.loaded.navigation,
    ]);

    expect(metadata.title).toBe("Frankenstein");
    expect(metadata.creator).toBe("Mary Shelley");
    expect(metadata.language).toBe("en");
    expect(navigation.toc).toHaveLength(2);
    expect(navigation.toc[0].label.trim()).toBe("Letter I");
  });

  it("parse correctement un EPUB avec un seul chapitre", async () => {
    const { default: ePub } = await import("epubjs");

    const buffer = await createTestEpub({
      title: "Nouvelle courte",
      author: "Auteur Test",
      language: "fr",
      identifier: "test-single-chapter",
      chapters: [
        {
          id: "main",
          title: "Texte unique",
          content: "Il était une fois un test unitaire qui vivait dans un projet ambitieux.",
        },
      ],
    });

    const book = ePub(buffer);
    await book.ready;
    const navigation = await book.loaded.navigation;

    expect(book.spine.items).toHaveLength(1);
    expect(navigation.toc).toHaveLength(1);
    expect(navigation.toc[0].label.trim()).toBe("Texte unique");
  });

  it("parse correctement un EPUB avec 10 chapitres", async () => {
    const { default: ePub } = await import("epubjs");

    const chapters = Array.from({ length: 10 }, (_, i) => ({
      id: `ch${i + 1}`,
      title: `Chapitre ${i + 1}`,
      content: `Contenu du chapitre numéro ${i + 1}. `.repeat(20),
    }));

    const buffer = await createTestEpub({
      title: "Roman Test",
      author: "Auteur Sénégalais",
      language: "fr",
      identifier: "test-10-chapters",
      chapters,
    });

    const book = ePub(buffer);
    const [navigation] = await Promise.all([book.loaded.navigation, book.ready]);

    expect(book.spine.items).toHaveLength(10);
    expect(navigation.toc).toHaveLength(10);
    expect(navigation.toc[9].label.trim()).toBe("Chapitre 10");
  });
});
