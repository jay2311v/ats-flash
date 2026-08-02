import { NextResponse } from "next/server";
import {
  ACCEPTED_EXTENSIONS,
  MAX_FILE_BYTES,
  extensionFromFileName,
  extractText,
} from "@/lib/parseResume";
import { collectTopSuggestions, scoreResumeText } from "@/lib/scoring";
import { matchKeywordsToResume } from "@/lib/keywords";
import type { AnalysisResult } from "@/lib/types";

export const runtime = "nodejs";

function countWords(text: string): number {
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data with a resume file." }, { status: 400 });
  }

  const file = formData.get("resume");
  const jobDescription = (formData.get("jobDescription") as string | null) ?? "";

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No resume file was uploaded." }, { status: 400 });
  }

  const extension = extensionFromFileName(file.name);
  if (!extension) {
    return NextResponse.json(
      { error: `Unsupported file type. Please upload a ${ACCEPTED_EXTENSIONS.join(" or ").toUpperCase()} file.` },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File is too large. Maximum size is ${MAX_FILE_BYTES / (1024 * 1024)}MB.` },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let text: string;
  try {
    text = await extractText(buffer, extension);
  } catch {
    return NextResponse.json(
      { error: "Could not read this file. It may be corrupted, password-protected, or in an unsupported format." },
      { status: 422 }
    );
  }

  const { categories, overallScore, grade } = scoreResumeText(text);
  const topSuggestions = collectTopSuggestions(categories);
  const jobMatch = jobDescription.trim().length > 20
    ? matchKeywordsToResume(jobDescription, text)
    : null;

  const result: AnalysisResult = {
    overallScore,
    grade,
    categories,
    topSuggestions,
    jobMatch,
    meta: {
      fileName: file.name,
      fileType: extension,
      wordCount: countWords(text),
      charCount: text.length,
      parseMs: Date.now() - startedAt,
    },
    resumeText: text.slice(0, 8000),
  };

  return NextResponse.json(result);
}
