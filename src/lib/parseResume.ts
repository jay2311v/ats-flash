import mammoth from "mammoth";
import type { AcceptedExtension } from "@/lib/constants";

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

// mammoth's extractRawText() walks the document tree and concatenates text
// runs, but it silently drops each paragraph's `numbering` info — so a
// native Word bullet/numbered list item comes out as a bare line with no
// leading marker. A PDF export of the same resume renders those bullets as
// literal glyphs (•, -, 1.), which pdfjs *does* capture as text. The result:
// scoring's bullet-point regex (BULLET_LINE_RE) matches the PDF's lines but
// not the DOCX's, which cascades into the bullet, quantified-achievement,
// and action-verb categories all scoring lower for the identical resume
// when uploaded as .docx. Converting to HTML first goes through mammoth's
// list style map (ul/ol > li), so we can re-add an explicit bullet marker
// per list item and keep both formats scoring consistently.
function htmlToBulletAwareText(html: string): string {
  return html
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/(p|h[1-6]|div|tr|table|ul|ol|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'");
}

export async function extractText(
  buffer: Buffer,
  extension: AcceptedExtension
): Promise<string> {
  if (extension === "pdf") {
    return extractPdfText(buffer);
  }

  const result = await mammoth.convertToHtml({ buffer });
  return htmlToBulletAwareText(result.value ?? "");
}
