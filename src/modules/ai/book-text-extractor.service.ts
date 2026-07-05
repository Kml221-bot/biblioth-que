import { BadRequestException, Injectable } from "@nestjs/common";
import axios from "axios";

export type ExtractedBookPage = {
  page: number;
  content: string;
};

@Injectable()
export class BookTextExtractorService {
  async extractFromUrl(
    fileUrl: string
  ): Promise<{ format: "pdf" | "text"; pages: ExtractedBookPage[] }> {
    const response = await axios.get<ArrayBuffer>(fileUrl, {
      responseType: "arraybuffer",
      timeout: 60_000,
      maxContentLength: 80 * 1024 * 1024,
    });
    const buffer = Buffer.from(response.data);
    const contentType = String(
      response.headers["content-type"] ?? ""
    ).toLowerCase();

    if (this.isPdf(fileUrl, contentType, buffer)) {
      return {
        format: "pdf",
        pages: await this.extractPdfPages(buffer),
      };
    }

    if (this.isText(fileUrl, contentType)) {
      return {
        format: "text",
        pages: this.extractTextPages(buffer.toString("utf8")),
      };
    }

    throw new BadRequestException(
      "Format non supporte pour extraction automatique. PDF et texte brut seulement."
    );
  }

  private async extractPdfPages(buffer: Buffer): Promise<ExtractedBookPage[]> {
    const pdfjs = (await import("pdfjs-dist/legacy/build/pdf.mjs")) as {
      getDocument: (options: {
        data: Uint8Array;
        disableWorker: boolean;
        useSystemFonts: boolean;
      }) => {
        promise: Promise<{
          numPages: number;
          getPage: (pageNumber: number) => Promise<{
            getTextContent: () => Promise<{
              items: Array<{ str?: string }>;
            }>;
          }>;
        }>;
      };
    };
    const pdf = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      disableWorker: true,
      useSystemFonts: true,
    }).promise;
    const pages: ExtractedBookPage[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const content = textContent.items
        .map(item => item.str?.trim() ?? "")
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (content.length > 0) {
        pages.push({
          page: pageNumber,
          content,
        });
      }
    }

    return pages;
  }

  private extractTextPages(content: string): ExtractedBookPage[] {
    const normalized = content.replace(/\r\n/g, "\n").trim();

    if (!normalized) {
      return [];
    }

    const pageSize = 4000;
    const pages: ExtractedBookPage[] = [];

    for (let index = 0; index < normalized.length; index += pageSize) {
      pages.push({
        page: pages.length + 1,
        content: normalized.slice(index, index + pageSize),
      });
    }

    return pages;
  }

  private isPdf(fileUrl: string, contentType: string, buffer: Buffer) {
    return (
      contentType.includes("application/pdf") ||
      fileUrl.toLowerCase().includes(".pdf") ||
      buffer.subarray(0, 4).toString() === "%PDF"
    );
  }

  private isText(fileUrl: string, contentType: string) {
    const lowerUrl = fileUrl.toLowerCase();

    return (
      contentType.startsWith("text/") ||
      lowerUrl.endsWith(".txt") ||
      lowerUrl.endsWith(".md")
    );
  }
}
