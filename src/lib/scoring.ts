import { ACTION_VERB_SET } from "./actionVerbs";
import type { CategoryResult, CheckResult } from "./types";

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{3,4}/;
const BULLET_LINE_RE = /^\s*([•▪●◦‣∙\-*]|\d+[.)])\s+/;
const NUMBER_RE = /(\$\s?\d|\d+\s?%|\b\d{1,3}(,\d{3})+\b|\b\d+(\.\d+)?[kKmMxX]\b|\b\d+\+\b)/;
const REPLACEMENT_CHAR_RE = /[�-]/g;

// Generous, substring-based detection used only for the "Standard Section
// Headings" score — real resumes use many synonyms for the same concept
// (e.g. "Academic Background" instead of "Education"), so this errs toward
// recognizing a section rather than demanding one exact phrase.
const SECTION_PATTERNS: { id: string; label: string; pattern: RegExp }[] = [
  { id: "summary", label: "Summary / Objective", pattern: /\b(summary|objective|profile|career goals)\b/i },
  {
    id: "experience",
    label: "Work Experience",
    pattern: /\b(experience|employment|work history|career history)\b/i,
  },
  {
    id: "education",
    label: "Education",
    pattern: /\b(education|academic background|academic history|educational qualifications)\b/i,
  },
  {
    id: "skills",
    label: "Skills",
    pattern: /\b(skills|competenc(y|ies)|expertise|proficienc(y|ies)|tech stack)\b/i,
  },
];

// Strips decorative wrapping some resumes style headers with (e.g.
// "— EXPERIENCE —", "*** Skills ***", "|| Education ||") so the header text
// underneath still matches cleanly.
function normalizeHeaderLine(line: string): string {
  return line
    .replace(/^[\s\-–—=~*•◦▪●#|>]+/, "")
    .replace(/[\s\-–—=~*•◦▪●#|<]+$/, "")
    .trim();
}

// Up to a few generic modifier words before the header's core noun (e.g.
// "Professional Experience", "Licenses & Certifications", "Relevant
// Projects") — real resumes prefix the same handful of core section nouns
// with all kinds of adjectives, so this generalizes instead of enumerating
// every combination.
const HEADER_MODIFIER = "(?:(?:[a-z]+|&)\\s+){0,4}";

// Section headers where content is achievement/responsibility statements —
// this is where action-verb and quantified-metric checks should apply.
// Anchored to the whole line (after stripping decoration) so a bullet that
// merely *mentions* "experience" mid-sentence isn't mistaken for a header.
const VERB_SECTION_HEADER_RE = new RegExp(
  "^(" +
    HEADER_MODIFIER + "experience|" +
    HEADER_MODIFIER + "history|" +
    HEADER_MODIFIER + "(projects?|portfolio)|" +
    HEADER_MODIFIER + "employment|" +
    HEADER_MODIFIER + "volunteer(ing)?(\\s+(work|experience))?|" +
    "internships?|career highlights|client work|case studies" +
    ")\\s*:?$",
  "i"
);

// Section headers where content is naturally noun/keyword-driven (skills,
// tools, credentials, biography) rather than achievement statements —
// bullets here shouldn't be judged for leading action verbs or metrics.
// Every "core noun" group gets the same HEADER_MODIFIER prefix so real
// modifiers ("Professional Profile", "Continuing Education") still match —
// only genuinely fixed idioms (reversed word order, multi-word phrases with
// no single trailing noun) are listed as flat literals.
const NOUN_LIST_HEADER_RE = new RegExp(
  "^(" +
    HEADER_MODIFIER + "(skills|expertise|competenc(y|ies)|proficienc(y|ies)|qualifications)|" +
    HEADER_MODIFIER + "(certifications?|certificates?|credentials?|licen(s|c)e(s|ure)?s?)|" +
    HEADER_MODIFIER + "(training|coursework|workshops?)|" +
    HEADER_MODIFIER + "(summary|objective|profile|goals)|" +
    HEADER_MODIFIER + "education|" +
    "objective statement|summary of qualifications|academic background|academic history|" +
    "graduate studies|educational qualifications|" +
    "languages?|language proficiency|multilingual skills|language fluency|" +
    "interests?|hobbies|" +
    "publications?|research (and|&) publications|published work|articles (and|&) papers|" +
    "presentations?|public speaking|conference participation|" +
    "professional memberships|industry associations|" +
    "awards?((\\s+(and|&)\\s+)honou?rs?)?|honou?rs?|achievements?|recognitions?|" +
    "references?|additional information|" +
    "tech stack|tools (and|&) technologies|industry knowledge" +
    ")\\s*:?$",
  "i"
);

function classifySectionHeader(line: string): "verb" | "noun" | null {
  const normalized = normalizeHeaderLine(line);
  if (normalized.length === 0 || normalized.length > 60) return null;
  if (VERB_SECTION_HEADER_RE.test(normalized)) return "verb";
  if (NOUN_LIST_HEADER_RE.test(normalized)) return "noun";
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function nonEmptyLines(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

function countWords(text: string): number {
  const matches = text.trim().match(/\S+/g);
  return matches ? matches.length : 0;
}

function categoryFromChecks(id: string, label: string, checks: CheckResult[]): CategoryResult {
  const score = checks.reduce((sum, c) => sum + c.points, 0);
  const maxScore = checks.reduce((sum, c) => sum + c.maxPoints, 0);
  return { id, label, score, maxScore, checks };
}

function scoreParseability(text: string): CategoryResult {
  const charCount = text.trim().length;
  const checks: CheckResult[] = [];

  if (charCount < 200) {
    checks.push({
      id: "text-extraction",
      label: "Text is extractable",
      status: "fail",
      points: 0,
      maxPoints: 8,
      detail: `Only ${charCount} characters could be extracted from this file.`,
      suggestion:
        "Your resume looks image-based or scanned. ATS systems cannot read text inside images — export it as a text-based PDF or DOCX instead.",
    });
  } else {
    checks.push({
      id: "text-extraction",
      label: "Text is extractable",
      status: "pass",
      points: 8,
      maxPoints: 8,
      detail: `Extracted ${charCount} characters of text successfully.`,
    });
  }

  const weirdChars = text.match(REPLACEMENT_CHAR_RE)?.length ?? 0;
  const weirdRatio = charCount > 0 ? weirdChars / charCount : 0;
  if (weirdRatio > 0.02) {
    checks.push({
      id: "clean-encoding",
      label: "Clean text encoding",
      status: "fail",
      points: 0,
      maxPoints: 7,
      detail: "Detected unusual/undecodable characters, likely from icons, images, or special symbols.",
      suggestion:
        "Remove icons, symbol fonts, and graphics used for section headers or bullets — they can turn into garbled characters for ATS parsers.",
    });
  } else if (weirdRatio > 0) {
    checks.push({
      id: "clean-encoding",
      label: "Clean text encoding",
      status: "warn",
      points: 4,
      maxPoints: 7,
      detail: "A few unusual characters were detected in the extracted text.",
      suggestion: "Double-check for stray icons or symbols that may not render correctly in ATS software.",
    });
  } else {
    checks.push({
      id: "clean-encoding",
      label: "Clean text encoding",
      status: "pass",
      points: 7,
      maxPoints: 7,
      detail: "No garbled or unreadable characters detected.",
    });
  }

  return categoryFromChecks("parseability", "File Parseability", checks);
}

function scoreContactInfo(text: string): CategoryResult {
  const checks: CheckResult[] = [];
  const hasEmail = EMAIL_RE.test(text);
  const hasPhone = PHONE_RE.test(text);

  checks.push({
    id: "email",
    label: "Email address",
    status: hasEmail ? "pass" : "fail",
    points: hasEmail ? 5 : 0,
    maxPoints: 5,
    detail: hasEmail ? "Email address found." : "No email address detected.",
    suggestion: hasEmail ? undefined : "Add a professional email address near the top of your resume.",
  });

  checks.push({
    id: "phone",
    label: "Phone number",
    status: hasPhone ? "pass" : "fail",
    points: hasPhone ? 5 : 0,
    maxPoints: 5,
    detail: hasPhone ? "Phone number found." : "No phone number detected.",
    suggestion: hasPhone ? undefined : "Add a phone number so recruiters and ATS contact fields can find it.",
  });

  return categoryFromChecks("contact", "Contact Information", checks);
}

function scoreSections(text: string): CategoryResult {
  const checks: CheckResult[] = SECTION_PATTERNS.map(({ id, label, pattern }) => {
    const found = pattern.test(text);
    return {
      id,
      label,
      status: found ? "pass" : "fail",
      points: found ? 5 : 0,
      maxPoints: 5,
      detail: found ? `"${label}" section detected.` : `No "${label}" section header detected.`,
      suggestion: found ? undefined : `Add a clearly labeled "${label}" section heading.`,
    } satisfies CheckResult;
  });

  return categoryFromChecks("sections", "Standard Section Headings", checks);
}

function scoreLength(text: string): CategoryResult {
  const words = countWords(text);
  let points: number;
  let status: CheckResult["status"];
  let detail: string;
  let suggestion: string | undefined;

  if (words >= 400 && words <= 900) {
    points = 10;
    status = "pass";
    detail = `${words} words — a solid, ATS-friendly length.`;
  } else if (words >= 300 && words <= 1100) {
    points = 7;
    status = "warn";
    detail = `${words} words — acceptable but slightly outside the ideal range.`;
    suggestion = "Aim for 400-900 words (roughly one page for early-career, up to two for senior roles).";
  } else if (words < 300) {
    points = 3;
    status = "fail";
    detail = `${words} words — this resume looks too short.`;
    suggestion = "Add more detail on your experience, achievements, and skills — resumes under 300 words often look incomplete.";
  } else {
    points = 4;
    status = "fail";
    detail = `${words} words — this resume looks too long.`;
    suggestion = "Trim your resume to the most relevant, recent experience — most ATS reviewers skim the first page.";
  }

  return categoryFromChecks("length", "Resume Length", [
    { id: "word-count", label: "Word count", status, points, maxPoints: 10, detail, suggestion },
  ]);
}

function scoreBullets(text: string): { category: CategoryResult; achievementBulletLines: string[] } {
  const lines = nonEmptyLines(text);

  // Walk the resume in order, tracking which kind of section we're in, so
  // noun/keyword lists (Skills, Certifications, Education, ...) can be
  // excluded from achievement-style checks (action verbs, metrics) further
  // down — those checks only make sense for Experience/Projects bullets.
  // Sections we don't recognize default to "included" so unusual headers
  // don't silently drop real achievement content.
  let currentSection: "verb" | "noun" | "unknown" = "unknown";
  const explicitBullets: string[] = [];
  const achievementBullets: string[] = [];
  const fallbackLines: string[] = [];
  const achievementFallbackLines: string[] = [];

  for (const line of lines) {
    const headerKind = classifySectionHeader(line);
    if (headerKind) {
      currentSection = headerKind;
      continue;
    }

    const isBullet = BULLET_LINE_RE.test(line);
    const isPseudoBullet = line.length < 140 && /^[A-Z]/.test(line);

    if (isBullet) {
      explicitBullets.push(line);
      if (currentSection !== "noun") achievementBullets.push(line);
    }
    if (isBullet || isPseudoBullet) {
      fallbackLines.push(line);
      if (currentSection !== "noun") achievementFallbackLines.push(line);
    }
  }

  const ratio = lines.length > 0 ? explicitBullets.length / lines.length : 0;

  let points: number;
  let status: CheckResult["status"];
  let detail: string;
  let suggestion: string | undefined;

  if (ratio >= 0.25) {
    points = 10;
    status = "pass";
    detail = `${explicitBullets.length} bullet-point lines detected.`;
  } else if (ratio >= 0.1) {
    points = 6;
    status = "warn";
    detail = `Only ${explicitBullets.length} bullet-point lines detected out of ${lines.length} lines.`;
    suggestion = "Break dense paragraphs into concise bullet points (start each with •, -, or a number) — ATS and recruiters scan bullets faster than prose.";
  } else {
    points = 2;
    status = "fail";
    detail = "Very few or no bullet points detected — content looks like dense paragraphs.";
    suggestion = "Rewrite your experience section using short bullet points instead of paragraphs.";
  }

  const category = categoryFromChecks("bullets", "Bullet Point Usage", [
    { id: "bullet-ratio", label: "Bullet point structure", status, points, maxPoints: 10, detail, suggestion },
  ]);

  const achievementBulletLines =
    achievementBullets.length > 0 ? achievementBullets : achievementFallbackLines;

  return { category, achievementBulletLines };
}

function scoreQuantifiedAchievements(achievementBulletLines: string[]): CategoryResult {
  const total = achievementBulletLines.length;
  const quantified = achievementBulletLines.filter((l) => NUMBER_RE.test(l)).length;
  const ratio = total > 0 ? quantified / total : 0;
  const points = clamp(Math.round(ratio / 0.4 * 15), 0, 15);

  let status: CheckResult["status"] = "pass";
  let suggestion: string | undefined;
  if (points < 8) {
    status = "fail";
    suggestion = "Quantify your impact wherever possible — add numbers, percentages, dollar amounts, or timeframes (e.g. \"reduced load time by 35%\").";
  } else if (points < 13) {
    status = "warn";
    suggestion = "Add more metrics to your bullet points — quantified achievements stand out to both ATS keyword scans and recruiters.";
  }

  return categoryFromChecks("metrics", "Quantified Achievements", [
    {
      id: "quantified-ratio",
      label: "Metrics in bullet points",
      status,
      points,
      maxPoints: 15,
      detail: total > 0
        ? `${quantified} of ${total} experience/project bullet points include a number or metric.`
        : "No experience or project bullet points were detected to evaluate for metrics.",
      suggestion,
    },
  ]);
}

function scoreActionVerbs(achievementBulletLines: string[]): CategoryResult {
  const total = achievementBulletLines.length;
  const withVerb = achievementBulletLines.filter((l) => {
    const firstWord = l.replace(BULLET_LINE_RE, "").trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "");
    return firstWord ? ACTION_VERB_SET.has(firstWord) : false;
  }).length;
  const ratio = total > 0 ? withVerb / total : 0;
  const points = clamp(Math.round(ratio / 0.5 * 10), 0, 10);

  let status: CheckResult["status"] = "pass";
  let suggestion: string | undefined;
  if (points < 5) {
    status = "fail";
    suggestion = "Start bullet points with strong action verbs (Led, Built, Increased, Launched) instead of phrases like \"Responsible for\".";
  } else if (points < 9) {
    status = "warn";
    suggestion = "Use a strong action verb at the start of more bullet points to make achievements punchier.";
  }

  return categoryFromChecks("verbs", "Action Verbs", [
    {
      id: "action-verb-ratio",
      label: "Bullets starting with action verbs",
      status,
      points,
      maxPoints: 10,
      detail: total > 0
        ? `${withVerb} of ${total} experience/project bullet points start with a strong action verb.`
        : "No experience or project bullet points were detected to evaluate.",
      suggestion,
    },
  ]);
}

function scoreFormattingRedFlags(text: string): CategoryResult {
  const lines = nonEmptyLines(text);
  const checks: CheckResult[] = [];

  const weirdChars = text.match(REPLACEMENT_CHAR_RE)?.length ?? 0;
  checks.push({
    id: "no-graphics-artifacts",
    label: "No icon/graphic artifacts",
    status: weirdChars === 0 ? "pass" : "fail",
    points: weirdChars === 0 ? 5 : 0,
    maxPoints: 5,
    detail: weirdChars === 0
      ? "No leftover icon or graphic character artifacts found."
      : "Detected characters typically left behind by icons or graphic bullets.",
    suggestion: weirdChars === 0
      ? undefined
      : "Avoid icons, text boxes, and graphics for contact info or bullets — use plain text instead.",
  });

  const irregularGapLines = lines.filter((l) => /\S {4,}\S/.test(l)).length;
  const irregularRatio = lines.length > 0 ? irregularGapLines / lines.length : 0;
  const multiColumnSuspected = irregularRatio > 0.15;
  checks.push({
    id: "single-column-layout",
    label: "Single-column, linear layout",
    status: multiColumnSuspected ? "warn" : "pass",
    points: multiColumnSuspected ? 2 : 5,
    maxPoints: 5,
    detail: multiColumnSuspected
      ? "Extracted text shows irregular spacing patterns often caused by multi-column layouts or tables."
      : "Text reads in a consistent, linear order.",
    suggestion: multiColumnSuspected
      ? "Avoid multi-column layouts, tables, and text boxes — they can scramble reading order in ATS parsers. Use a single-column format."
      : undefined,
  });

  return categoryFromChecks("formatting", "ATS Formatting Red Flags", checks);
}

export function scoreResumeText(text: string): {
  categories: CategoryResult[];
  overallScore: number;
  grade: string;
} {
  const { category: bulletsCategory, achievementBulletLines } = scoreBullets(text);

  const categories = [
    scoreParseability(text),
    scoreContactInfo(text),
    scoreSections(text),
    scoreLength(text),
    bulletsCategory,
    scoreQuantifiedAchievements(achievementBulletLines),
    scoreActionVerbs(achievementBulletLines),
    scoreFormattingRedFlags(text),
  ];

  const overallScore = clamp(
    Math.round(categories.reduce((sum, c) => sum + c.score, 0)),
    0,
    100
  );

  const grade =
    overallScore >= 90 ? "Excellent" :
    overallScore >= 75 ? "Good" :
    overallScore >= 60 ? "Fair" :
    overallScore >= 40 ? "Needs Work" : "Poor";

  return { categories, overallScore, grade };
}

export function collectTopSuggestions(categories: CategoryResult[], limit = 8): string[] {
  const withLoss = categories
    .flatMap((c) => c.checks)
    .filter((c) => c.suggestion)
    .map((c) => ({ suggestion: c.suggestion as string, lost: c.maxPoints - c.points }))
    .sort((a, b) => b.lost - a.lost);

  const seen = new Set<string>();
  const result: string[] = [];
  for (const { suggestion } of withLoss) {
    if (seen.has(suggestion)) continue;
    seen.add(suggestion);
    result.push(suggestion);
    if (result.length >= limit) break;
  }
  return result;
}
