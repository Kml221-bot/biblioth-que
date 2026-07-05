import { config } from "dotenv";
import { fetchBooksForTextIndexing, indexBookPdfText } from "../lib/bookTextIndexer.js";

config();

function readNumberArg(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const value = process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBooleanArg(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const limit = Math.min(Math.max(readNumberArg("limit", 10), 1), 100);
  const maxPages = Math.min(Math.max(readNumberArg("max-pages", 80), 1), 300);
  const force = readBooleanArg("force");

  const books = await fetchBooksForTextIndexing(limit);
  const results = [];

  for (const book of books) {
    try {
      const result = await indexBookPdfText(book, { force, maxPages });
      results.push(result);
      console.log(`${result.skipped ? "SKIP" : "OK"} ${result.title} - ${result.indexedPages}/${result.totalPages} pages`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "INDEX_FAILED";
      results.push({
        bookId: book.id,
        title: book.titre,
        indexedPages: 0,
        totalPages: Number(book.pages_count || 0),
        skipped: true,
        reason: message,
      });
      console.log(`FAIL ${book.titre} - ${message}`);
    }
  }

  const indexed = results.filter(row => !row.skipped).length;
  const skipped = results.filter(row => row.skipped).length;
  console.log(`Done: ${indexed} indexed, ${skipped} skipped, ${results.length} total.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
