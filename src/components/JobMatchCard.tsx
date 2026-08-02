import type { JobMatchResult } from "@/lib/types";

export function JobMatchCard({ jobMatch }: { jobMatch: JobMatchResult }) {
  return (
    <div className="glass animate-fade-in-up rounded-2xl border border-card-border p-4 shadow-tinted">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Job Description Match</h3>
        <span className="font-display text-lg font-semibold tabular-nums text-primary">{jobMatch.score}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${jobMatch.score}%` }}
        />
      </div>

      {jobMatch.matchedKeywords.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-sm text-muted-foreground">Matched keywords</p>
          <div className="flex flex-wrap gap-1.5">
            {jobMatch.matchedKeywords.map((k) => (
              <span key={k} className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {jobMatch.missingKeywords.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-sm text-muted-foreground">Missing from your resume</p>
          <div className="flex flex-wrap gap-1.5">
            {jobMatch.missingKeywords.map((k) => (
              <span key={k} className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-600 dark:text-red-400">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
