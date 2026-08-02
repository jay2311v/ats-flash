"use client";

import { useState } from "react";
import { UploadZone } from "@/components/UploadZone";
import { ScoreRing } from "@/components/ScoreRing";
import { AtsScanSequence } from "@/components/AtsScanSequence";
import { CategoryList } from "@/components/CategoryList";
import { JobMatchCard } from "@/components/JobMatchCard";
import { AiSuggestions } from "@/components/AiSuggestions";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { AnalysisResult } from "@/lib/types";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  async function handleAnalyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("resume", file);
    if (jobDescription.trim()) formData.append("jobDescription", jobDescription);

    try {
      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong while analyzing your resume.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Could not reach the analysis service. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-6 py-4">
      <div className="flex flex-col gap-3">
        <header className="flex items-center justify-between gap-4">
          <span className="font-display text-lg font-semibold">
            ATS <span className="text-primary">Flash</span>
          </span>
          <ThemeToggle />
        </header>

        <section className="flex flex-col gap-2">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Results in seconds, not minutes
          </span>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-balance">
            Is your resume <span className="text-primary">ATS-ready?</span>
          </h1>
          <p className="max-w-md text-muted-foreground">
            Upload your resume for an instant ATS score, category breakdown, and concrete suggestions to improve it.
          </p>
        </section>
      </div>

      <section className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <UploadZone file={file} onFileSelected={setFile} disabled={loading} />

          <div>
            <label htmlFor="jd" className="mb-1.5 block text-sm font-medium">
              Job description <span className="font-normal text-muted-foreground">(optional — for keyword match)</span>
            </label>
            <textarea
              id="jd"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              disabled={loading}
              rows={4}
              placeholder="Paste the job description here to also see a keyword match score…"
              className="glass w-full resize-none rounded-lg border border-card-border p-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!file || loading}
            className="group relative cursor-pointer overflow-hidden rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition-all glow hover:bg-primary-hover hover:glow-strong active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/25 transition-transform duration-500 group-hover:translate-x-full" />
            <span className="relative">{loading ? "Analyzing…" : "Check My ATS Score"}</span>
          </button>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="glass shadow-tinted-lg flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-card-border p-5">
          {result ? (
            <div className="animate-fade-in-up flex flex-col items-center gap-3">
              <ScoreRing score={result.overallScore} grade={result.grade} />
              <p className="text-center text-sm text-muted-foreground">
                {result.meta.fileName} · {result.meta.wordCount} words · analyzed in {result.meta.parseMs}ms
              </p>
            </div>
          ) : loading ? (
            <AtsScanSequence />
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-muted-foreground/60">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 8v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="12" cy="15.5" r="0.75" fill="currentColor" />
              </svg>
              <p className="text-muted-foreground">Your ATS score will appear here once you upload a resume.</p>
            </div>
          )}
        </div>
      </section>

      {result && (
        <section className="flex flex-col gap-6">
          <div className="animate-fade-in-up">
            <h2 className="mb-3 font-display text-lg font-semibold">Top Suggestions</h2>
            <ol className="flex flex-col gap-2">
              {result.topSuggestions.length === 0 ? (
                <li className="text-sm text-muted-foreground">No major issues found — nice work!</li>
              ) : (
                result.topSuggestions.map((s, i) => (
                  <li
                    key={i}
                    className="glass animate-fade-in-up flex gap-2 rounded-lg border border-card-border p-3 text-sm transition-colors hover:border-primary/30"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <span className="font-medium text-primary">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))
              )}
            </ol>
          </div>

          {result.jobMatch && <JobMatchCard jobMatch={result.jobMatch} />}

          <div className="animate-fade-in-up">
            <h2 className="mb-3 font-display text-lg font-semibold">Score Breakdown</h2>
            <CategoryList categories={result.categories} />
          </div>

          <AiSuggestions
            resumeText={result.resumeText}
            jobDescription={jobDescription}
            overallScore={result.overallScore}
            topSuggestions={result.topSuggestions}
          />
        </section>
      )}

      <footer className="mt-auto flex items-center justify-center gap-1.5 pt-4 text-center text-xs text-muted-foreground/70">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="11" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        Rule-based analysis runs entirely server-side — nothing is stored.
      </footer>
    </main>
  );
}
