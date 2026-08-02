import mammoth from "mammoth";

export const ACCEPTED_EXTENSIONS = ["pdf", "docx"] as const;
export type AcceptedExtension = (typeof ACCEPTED_EXTENSIONS)[number];

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export class UnsupportedFileError extends Error {}

export function extensionFromFileName(fileName: string): AcceptedExtension | null {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "pdf" || ext === "docx") return ext;
  return null;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  // Loaded dynamically because pdfjs-dist's Node build is ESM-only.
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const path = await import("node:path");
  const { pathToFileURL } = await import("node:url");
  pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(
    path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")
  ).href;

  const doc = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise;

  const pageTexts: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    let pageText = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      pageText += item.str + (item.hasEOL ? "\n" : "");
    }
    pageTexts.push(pageText);
  }
  await doc.destroy();

  return pageTexts.join("\n");
}

export async function extractText(
  buffer: Buffer,
  extension: AcceptedExtension
): Promise<string> {
  if (extension === "pdf") {
    return extractPdfText(buffer);
  }

  const result = await mammoth.extractRawText({ buffer });
  return result.value ?? "";
}
