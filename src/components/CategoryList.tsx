"use client";

import { useState } from "react";
import type { CategoryResult, CheckStatus } from "@/lib/types";

function StatusIcon({ status }: { status: CheckStatus }) {
  if (status === "pass") {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-green-500">
        <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === "warn") {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-yellow-500">
        <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-red-500">
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function barColor(ratio: number): string {
  if (ratio >= 0.85) return "bg-green-500";
  if (ratio >= 0.6) return "bg-yellow-500";
  return "bg-red-500";
}

function CategoryRow({ category }: { category: CategoryResult }) {
  const [open, setOpen] = useState(false);
  const ratio = category.maxScore > 0 ? category.score / category.maxScore : 0;

  return (
    <div className="clay rounded-2xl bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-3 p-3 text-left"
      >
        <span className="flex-1 font-medium">{category.label}</span>
        <span className="text-sm tabular-nums text-muted-foreground">{category.score}/{category.maxScore}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className="clay-well-sm mx-3 mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-[width] duration-500 ${barColor(ratio)}`} style={{ width: `${ratio * 100}%` }} />
      </div>
      {open && (
        <ul className="animate-fade-in-up space-y-2 border-t border-border px-3 py-3">
          {category.checks.map((check) => (
            <li key={check.id} className="flex gap-2 text-sm">
              <StatusIcon status={check.status} />
              <div>
                <p>{check.detail}</p>
                {check.suggestion && (
                  <p className="mt-0.5 text-muted-foreground">{check.suggestion}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CategoryList({ categories }: { categories: CategoryResult[] }) {
  return (
    <div className="flex flex-col gap-2">
      {categories.map((category) => (
        <CategoryRow key={category.id} category={category} />
      ))}
    </div>
  );
}
