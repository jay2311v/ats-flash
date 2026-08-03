import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";

// This route makes a real, billed LLM call per request — keep this tight.
// A visitor legitimately clicks "Get AI Suggestions" once or twice per
// analysis; this still allows retries without leaving the door open to a
// scripted loop burning through the API budget.
const RATE_LIMIT = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

interface RequestBody {
  resumeText?: string;
  jobDescription?: string;
  overallScore?: number;
  topSuggestions?: string[];
}

function buildPrompt(body: RequestBody, resumeText: string, jobDescription: string): string {
  return [
    "You are an expert resume coach helping a candidate improve their resume's ATS (Applicant Tracking System) performance.",
    `The resume already scored ${body.overallScore ?? "an unknown"}/100 on an automated rule-based ATS checker.`,
    "Rule-based issues already flagged (do NOT repeat these, go deeper or find new ones):",
    (body.topSuggestions ?? []).map((s) => `- ${s}`).join("\n") || "(none)",
    "",
    "Resume text:",
    "---",
    resumeText,
    "---",
    jobDescription ? `\nTarget job description:\n---\n${jobDescription}\n---` : "",
    "",
    "Give exactly 10 short, specific, actionable suggestions to improve this resume for ATS systems and human recruiters.",
    "Focus on wording, missing achievements, clarity, and (if a job description was given) alignment to that role.",
    "Respond ONLY with a JSON array of strings, no markdown, no preamble. Example: [\"suggestion one\", \"suggestion two\"]",
  ].join("\n");
}

function parseSuggestions(raw: string): string[] {
  // Some reasoning models leak a <think>...</think> block (or a stray
  // trailing </think> plus a duplicated answer) into the content field
  // even when reasoning is disabled — strip that out before parsing.
  const cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<\/?think>/gi, "")
    .trim();

  // Prefer the first well-formed JSON array over a greedy match, since a
  // greedy match can span a duplicated/garbled second copy of the answer.
  const candidates = [...cleaned.matchAll(/\[[\s\S]*?\]/g), ...cleaned.matchAll(/\[[\s\S]*\]/g)];
  for (const match of candidates) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
        return parsed;
      }
    } catch {
      // try the next candidate
    }
  }

  // The model didn't return valid JSON (e.g. an unescaped quote inside an
  // example broke the array). That array is still on a single line, so a
  // per-line parse would collapse the whole thing into one giant item —
  // recover the individual items by splitting on the `","` boundary
  // between array elements instead.
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    const items = arrayMatch[0]
      .slice(1, -1)
      .split(/"\s*,\s*"/)
      .map((item) => item.trim().replace(/^["']+/, "").replace(/["']+$/, "").trim())
      .filter((item) => item.length > 0);
    if (items.length > 1) {
      return items;
    }
  }

  // Fall back to a line-based parse that strips JSON array punctuation
  // instead of surfacing it as literal suggestions.
  return cleaned
    .split("\n")
    .map((line) =>
      line
        .trim()
        .replace(/,\s*$/, "")
        .replace(/^-\s*/, "")
        .replace(/^\d+[.)]\s*/, "")
        .replace(/"+$/, "")
        .replace(/^"+/, "")
        .trim()
    )
    .filter((line) => line.length > 0 && line !== "[" && line !== "]");
}

async function getAnthropicSuggestions(apiKey: string, prompt: string): Promise<string[]> {
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 1200,
    messages: [{ role: "user", content: prompt }],
  });
  const textBlock = message.content.find((block) => block.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "[]";
  return parseSuggestions(raw);
}

async function getNvidiaSuggestions(apiKey: string, prompt: string): Promise<string[]> {
  const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "nvidia/nemotron-3-nano-30b-a3b",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 1200,
      reasoning_budget: 0,
    }),
  });

  if (!res.ok) {
    throw new Error(`NVIDIA API returned ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const raw: string = data.choices?.[0]?.message?.content ?? "[]";
  return parseSuggestions(raw);
}

export async function POST(request: Request) {
  const { allowed, retryAfterSeconds } = await checkRateLimit(
    "ai-suggestions",
    getClientIp(request),
    RATE_LIMIT,
    RATE_LIMIT_WINDOW_MS
  );
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many requests. Please try again in ${retryAfterSeconds}s.` },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const nvidiaKey = process.env.NVIDIA_API_KEY;

  if (!anthropicKey && !nvidiaKey) {
    return NextResponse.json(
      { configured: false, error: "AI suggestions are not configured on this server (set ANTHROPIC_API_KEY or NVIDIA_API_KEY)." },
      { status: 200 }
    );
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const resumeText = (body.resumeText ?? "").slice(0, 8000);
  if (resumeText.trim().length < 50) {
    return NextResponse.json({ error: "Not enough resume text to analyze." }, { status: 400 });
  }

  const jobDescription = (body.jobDescription ?? "").slice(0, 4000);
  const prompt = buildPrompt(body, resumeText, jobDescription);

  try {
    const suggestions = anthropicKey
      ? await getAnthropicSuggestions(anthropicKey, prompt)
      : await getNvidiaSuggestions(nvidiaKey as string, prompt);

    return NextResponse.json({ configured: true, suggestions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ configured: true, error: `AI suggestion request failed: ${message}` }, { status: 502 });
  }
}
