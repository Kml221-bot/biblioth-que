import { Router } from "express";

const router = Router();

const DEFAULT_ALLOWED_HOSTS = [
  "openlibrary.org",
  "archive.org",
  "gutenberg.org",
  "www.gutenberg.org",
  "mangadex.org",
  "www.mangadex.org",
  "linuxcommand.org",
  "www.linuxcommand.org",
  "web.mit.edu",
  "standardebooks.org",
  "www.standardebooks.org",
  "fr.wikisource.org",
  "wikisource.org",
];
const MAX_READER_BYTES = Number(process.env.READER_PROXY_MAX_BYTES || 50 * 1024 * 1024);
const READER_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;

function getAllowedHosts(): string[] {
  const envHosts = process.env.READER_PROXY_ALLOWED_HOSTS
    ? process.env.READER_PROXY_ALLOWED_HOSTS.split(",").map(host => host.trim().toLowerCase())
    : [];
  const defaultHosts = DEFAULT_ALLOWED_HOSTS.map(host => host.trim().toLowerCase());
  return Array.from(new Set([...defaultHosts, ...envHosts])).filter(Boolean);
}

function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return getAllowedHosts().some(allowed => host === allowed || host.endsWith(`.${allowed}`));
}

async function fetchAllowedReaderUrl(initialUrl: URL): Promise<Response> {
  let targetUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    if (!["http:", "https:"].includes(targetUrl.protocol) || !isAllowedHost(targetUrl.hostname)) {
      throw new Error("READER_HOST_NOT_ALLOWED");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), READER_TIMEOUT_MS);

    try {
      const response = await fetch(targetUrl, {
        headers: {
          "accept": "text/html,application/xhtml+xml,application/pdf,application/xml;q=0.9,*/*;q=0.8",
          "user-agent": "BiblioTechReader/1.0",
        },
        redirect: "manual",
        signal: controller.signal,
      });

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) return response;
        targetUrl = new URL(location, targetUrl);
        continue;
      }

      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("READER_TOO_MANY_REDIRECTS");
}

async function readLimitedBuffer(response: Response): Promise<Buffer> {
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_READER_BYTES) {
    throw new Error("READER_RESPONSE_TOO_LARGE");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_READER_BYTES) {
    throw new Error("READER_RESPONSE_TOO_LARGE");
  }
  return buffer;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSafeFilename(value: string): string {
  const fallback = "bibliotech-document";
  const cleaned = value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 140);

  return cleaned || fallback;
}

function renderReaderError(title: string, message: string): string {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: #172033;
        background: #f8fafc;
      }
      main {
        width: min(560px, calc(100vw - 32px));
        padding: 28px;
        border: 1px solid #dbe3ef;
        border-radius: 8px;
        background: white;
        box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
      }
      h1 { margin: 0 0 10px; font-size: 20px; }
      p { margin: 0; line-height: 1.6; color: #526174; }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
    </main>
  </body>
</html>`;
}

function getReaderNavigationScript(): string {
  return `<script>
(() => {
  const toReaderUrl = (rawUrl) => {
    try {
      const absoluteUrl = new URL(rawUrl, document.baseURI).toString();
      return "/api/reader/proxy?url=" + encodeURIComponent(absoluteUrl);
    } catch {
      return rawUrl;
    }
  };

  document.addEventListener("click", (event) => {
    const anchor = event.target.closest && event.target.closest("a[href]");
    if (!anchor) return;

    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

    event.preventDefault();
    window.location.href = toReaderUrl(href);
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!form || !form.getAttribute) return;

    const action = form.getAttribute("action") || document.baseURI;
    form.setAttribute("action", toReaderUrl(action));
    form.removeAttribute("target");
  }, true);

  for (const anchor of document.querySelectorAll("a[target]")) {
    anchor.removeAttribute("target");
  }
})();
</script>`;
}

router.get("/proxy", async (req, res) => {
  const rawUrl = typeof req.query.url === "string" ? req.query.url : "";

  let targetUrl: URL;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    res.status(400).type("html").send(renderReaderError(
      "Lien de lecture invalide",
      "BiblioTech n'a pas pu préparer cette ressource dans le lecteur intégré.",
    ));
    return;
  }

  if (!["http:", "https:"].includes(targetUrl.protocol) || !isAllowedHost(targetUrl.hostname)) {
    res.status(403).type("html").send(renderReaderError(
      "Source non autorisée",
      "Cette source n'est pas encore autorisée pour la lecture intégrée BiblioTech.",
    ));
    return;
  }

  try {
    const upstream = await fetchAllowedReaderUrl(targetUrl);

    const contentType = upstream.headers.get("content-type") || "text/html; charset=utf-8";
    if (!upstream.ok) {
      res.status(upstream.status).type("html").send(renderReaderError(
        "Lecture indisponible",
        "La source n'a pas répondu correctement au lecteur intégré.",
      ));
      return;
    }

    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      const buffer = await readLimitedBuffer(upstream);
      res
        .status(200)
        .setHeader("content-type", contentType)
        .setHeader("cache-control", "public, max-age=1800")
        .send(buffer);
      return;
    }

    const htmlBuffer = await readLimitedBuffer(upstream);
    const html = htmlBuffer.toString("utf8");
    const baseTag = `<base href="${escapeHtml(targetUrl.toString())}">`;
    const htmlWithBase = html.includes("<head")
      ? html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`)
      : `${baseTag}${html}`;
    const proxiedHtml = htmlWithBase.includes("</body>")
      ? htmlWithBase.replace(/<\/body>/i, `${getReaderNavigationScript()}</body>`)
      : `${htmlWithBase}${getReaderNavigationScript()}`;

    res
      .status(200)
      .setHeader("content-type", "text/html; charset=utf-8")
      .setHeader("cache-control", "public, max-age=1800")
      .setHeader("x-frame-options", "SAMEORIGIN")
      .send(proxiedHtml);
  } catch (error) {
    console.error("Erreur proxy lecteur:", error);
    res.status(502).type("html").send(renderReaderError(
      "Lecture indisponible",
      "BiblioTech n'a pas pu charger cette ressource pour le moment.",
    ));
  }
});

router.get("/download", async (req, res) => {
  const rawUrl = typeof req.query.url === "string" ? req.query.url : "";
  const rawFilename = typeof req.query.filename === "string" ? req.query.filename : "bibliotech-document";

  let targetUrl: URL;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    res.status(400).type("text/plain").send("Lien de telechargement invalide.");
    return;
  }

  if (!["http:", "https:"].includes(targetUrl.protocol) || !isAllowedHost(targetUrl.hostname)) {
    res.status(403).type("text/plain").send("Source non autorisee pour le telechargement BiblioTech.");
    return;
  }

  try {
    const upstream = await fetchAllowedReaderUrl(targetUrl);
    if (!upstream.ok) {
      res.status(upstream.status).type("text/plain").send("Telechargement indisponible.");
      return;
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const buffer = await readLimitedBuffer(upstream);
    const filename = getSafeFilename(
      !/\.[a-z0-9]{2,8}$/i.test(rawFilename) && contentType.includes("application/pdf")
        ? `${rawFilename}.pdf`
        : rawFilename,
    );

    res
      .status(200)
      .setHeader("content-type", contentType)
      .setHeader("content-disposition", `attachment; filename="${filename}"`)
      .setHeader("cache-control", "private, max-age=600")
      .send(buffer);
  } catch (error) {
    console.error("Erreur telechargement lecteur:", error);
    res.status(502).type("text/plain").send("BiblioTech n'a pas pu telecharger cette ressource pour le moment.");
  }
});

export default router;
