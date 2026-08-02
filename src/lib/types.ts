export type CheckStatus = "pass" | "warn" | "fail";

export interface CheckResult {
  id: string;
  label: string;
  status: CheckStatus;
  points: number;
  maxPoints: number;
  detail: string;
  suggestion?: string;
}

export interface CategoryResult {
  id: string;
  label: string;
  score: number;
  maxScore: number;
  checks: CheckResult[];
}

export interface JobMatchResult {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
}

export interface AnalysisMeta {
  fileName: string;
  fileType: "pdf" | "docx";
  wordCount: number;
  charCount: number;
  parseMs: number;
}

export interface AnalysisResult {
  overallScore: number;
  grade: string;
  categories: CategoryResult[];
  topSuggestions: string[];
  jobMatch: JobMatchResult | null;
  meta: AnalysisMeta;
  resumeText: string;
}
