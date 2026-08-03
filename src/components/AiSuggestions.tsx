"use client";

import { useState } from "react";

interface AiSuggestionsProps {
  resumeText: string;
  jobDescription: string;
  overallScore: number;
  topSuggestions: string[];
}

export function AiSuggestions({ resumeText, jobDescription, overallScore, topSuggestions }: AiSuggestionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);

  async function fetchSuggestions() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescription, overallScore, topSuggestions }),
      });
      const data = await res.json();
      if (data.configured === false) {
        setNotConfigured(true);
      } else if (data.error) {
        setError(data.error);
      } else {
        setSuggestions(data.suggestions ?? []);
      }
    } catch {
      setError("Could not reach the AI suggestions service.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="clay animate-fade-in-up rounded-2xl bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="clay-sm flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card text-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium">10 AI-Powered Suggestions</h3>
            <p className="text-sm text-muted-foreground">Deeper, context-aware feedback.</p>
          </div>
        </div>
        {!suggestions && (
          <button
            type="button"
            onClick={fetchSuggestions}
            disabled={loading}
            className="clay-primary shrink-0 cursor-pointer rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {loading ? "Thinking…" : "Get AI Suggestions"}
          </button>
        )}
      </div>

      {notConfigured && (
        <p className="mt-3 text-sm text-muted-foreground">
          AI suggestions aren&apos;t enabled on this server. Set an <code className="clay-well-sm rounded-md bg-muted px-1">ANTHROPIC_API_KEY</code> or <code className="clay-well-sm rounded-md bg-muted px-1">NVIDIA_API_KEY</code> environment variable to turn this on.
        </p>
      )}

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      {suggestions && (
        <ul className="mt-3 space-y-2">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className="clay-well-sm animate-fade-in-up flex gap-2 rounded-xl bg-muted p-2.5 text-sm"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className="font-medium text-primary">{i + 1}.</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
