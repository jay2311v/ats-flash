"use client";

import { useEffect, useState } from "react";

// Mirrors the real category list in src/lib/scoring.ts — this isn't
// decorative copy, it's genuinely what gets checked during analysis.
const CHECKS = [
  "Parsing resume like an ATS would",
  "Verifying contact info fields",
  "Matching standard section headings",
  "Checking resume length",
  "Scanning bullet point structure",
  "Detecting quantified achievements",
  "Auditing action verbs",
  "Checking formatting red flags",
];

export function AtsScanSequence() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % CHECKS.length);
    }, 380);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex w-full max-w-[260px] flex-col items-center gap-4" role="status" aria-live="polite">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full glow" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-primary">Matching against {CHECKS.length} ATS parsing checks</p>
        <p className="mt-1 text-sm text-muted-foreground">{CHECKS[index]}…</p>
      </div>
      <div className="flex gap-1">
        {CHECKS.map((_, i) => (
          <span
            key={i}
            className={`h-1 w-4 rounded-full transition-colors duration-300 ${i <= index ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>
    </div>
  );
}
