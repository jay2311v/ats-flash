import type { JobMatchResult } from "./types";

const STOPWORDS = new Set(
  (
    "a about above after again against all am an and any are aren't as at be because been before " +
    "being below between both but by can't cannot could couldn't did didn't do does doesn't doing don't " +
    "down during each few for from further had hadn't has hasn't have haven't having he he'd he'll he's " +
    "her here here's hers herself him himself his how how's i i'd i'll i'm i've if in into is isn't it " +
    "it's its itself let's me more most mustn't my myself no nor not of off on once only or other ought " +
    "our ours ourselves out over own same shan't she she'd she'll she's should shouldn't so some such than " +
    "that that's the their theirs them themselves then there there's these they they'd they'll they're " +
    "they've this those through to too under until up very was wasn't we we'd we'll we're we've were " +
    "weren't what what's when when's where where's which while who who's whom why why's with won't would " +
    "wouldn't you you'd you'll you're you've your yours yourself yourselves will etc using use used able " +
    "including per within across via job role team work strong good excellent great looking seeking must " +
    "years experience company candidate ability skills knowledge understanding proven demonstrated required " +
    "requirements responsibilities preferred plus"
  ).split(" ")
);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+.#\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function isMeaningfulWord(word: string): boolean {
  if (word.length < 3) return false;
  if (STOPWORDS.has(word)) return false;
  if (/^\d+$/.test(word)) return false;
  return true;
}

/** Extracts the most frequent unigrams and bigrams from a job description as "important" keywords. */
export function extractKeywords(jobDescription: string, limit = 25): string[] {
  const words = tokenize(jobDescription);
  const freq = new Map<string, number>();

  for (const word of words) {
    if (!isMeaningfulWord(word)) continue;
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }

  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i];
    const b = words[i + 1];
    if (!isMeaningfulWord(a) || !isMeaningfulWord(b)) continue;
    const bigram = `${a} ${b}`;
    freq.set(bigram, (freq.get(bigram) ?? 0) + 1.5);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

export function matchKeywordsToResume(
  jobDescription: string,
  resumeText: string
): JobMatchResult {
  const keywords = extractKeywords(jobDescription);
  const haystack = resumeText.toLowerCase();

  const matched: string[] = [];
  const missing: string[] = [];

  for (const keyword of keywords) {
    if (haystack.includes(keyword)) {
      matched.push(keyword);
    } else {
      missing.push(keyword);
    }
  }

  const score = keywords.length === 0 ? 100 : Math.round((matched.length / keywords.length) * 100);

  return {
    score,
    matchedKeywords: matched,
    missingKeywords: missing.slice(0, 15),
  };
}
