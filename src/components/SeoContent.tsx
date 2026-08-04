// Single source of truth for the FAQ/HowTo content — rendered as visible
// page copy below and serialized into matching JSON-LD in the same
// component, so the structured data can never drift from what a visitor
// (or an AI crawler) actually sees on the page.

const SCORING_CATEGORIES = [
  { label: "File Parseability", points: 15, detail: "Can an ATS actually extract clean text from your file?" },
  { label: "Contact Information", points: 10, detail: "Is a valid email and phone number present?" },
  { label: "Standard Section Headings", points: 20, detail: "Summary, Experience, Education, and Skills, clearly labeled." },
  { label: "Resume Length", points: 10, detail: "400–900 words is the ATS-friendly sweet spot." },
  { label: "Bullet Point Usage", points: 10, detail: "Scannable bullets instead of dense paragraphs." },
  { label: "Quantified Achievements", points: 15, detail: "Numbers, percentages, and metrics in your experience bullets." },
  { label: "Action Verbs", points: 10, detail: "Experience bullets that lead with strong verbs, not \"Responsible for.\"" },
  { label: "ATS Formatting Red Flags", points: 10, detail: "Icons, graphics, and multi-column layouts that scramble parsers." },
] as const;

const HOW_IT_WORKS_STEPS = [
  { name: "Upload your resume", text: "Upload a PDF or DOCX resume, up to 4MB." },
  { name: "Add a job description (optional)", text: "Paste a job description to also get a keyword match score." },
  { name: "Get your ATS score", text: "See your score out of 100, a category breakdown, and AI-powered suggestions in seconds." },
] as const;

const FAQ_ITEMS = [
  {
    question: "What is an ATS (Applicant Tracking System)?",
    answer:
      "An ATS is software companies use to collect, scan, and rank resumes before a recruiter sees them. It looks for parseable text, standard section headings, and relevant keywords — resumes that confuse it can get filtered out automatically, regardless of the candidate's qualifications.",
  },
  {
    question: "How does ATS Flash calculate my resume score?",
    answer:
      "ATS Flash scores your resume out of 100 across eight categories — file parseability, contact info, section headings, length, bullet-point structure, quantified achievements, action verbs, and formatting red flags — using the same kind of rule-based text analysis real ATS parsers perform.",
  },
  {
    question: "Is ATS Flash free to use?",
    answer: "Yes. ATS Flash is free to use and doesn't require creating an account.",
  },
  {
    question: "Does ATS Flash store or share my resume?",
    answer:
      "No. Your resume is analyzed in memory on the server for that single request and is never saved to a database or shared with third parties.",
  },
  {
    question: "What file formats does ATS Flash support?",
    answer: "PDF and DOCX files up to 4MB.",
  },
  {
    question: "Can I match my resume against a specific job description?",
    answer:
      "Yes — paste a job description alongside your resume to get a keyword match score showing which important terms from the posting are present or missing from your resume.",
  },
  {
    question: "Does ATS Flash use AI?",
    answer:
      "Alongside its rule-based ATS scoring, ATS Flash generates AI-powered improvement suggestions tailored to your resume and the job description you provide.",
  },
] as const;

const HOW_TO_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to check your resume's ATS score",
  step: HOW_IT_WORKS_STEPS.map((step) => ({
    "@type": "HowToStep",
    name: step.name,
    text: step.text,
  })),
};

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export function SeoContent() {
  return (
    <section className="flex flex-col gap-10 border-t border-border/60 pt-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOW_TO_JSON_LD) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">How it works</h2>
        <ol className="flex flex-col gap-3 sm:flex-row">
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <li key={step.name} className="clay-sm flex-1 rounded-2xl bg-card p-3">
              <div className="flex items-center gap-2">
                <span className="clay-sm flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <span className="text-sm font-medium">{step.name}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">How ATS Flash scores your resume</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          ATS Flash checks your resume against the same kind of rule-based parsing real applicant tracking
          systems use, scoring it out of 100 across eight categories:
        </p>
        <dl className="grid gap-3 sm:grid-cols-2">
          {SCORING_CATEGORIES.map((cat) => (
            <div key={cat.label} className="clay-sm rounded-2xl bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-sm font-medium">{cat.label}</dt>
                <span className="shrink-0 text-xs font-medium text-primary">{cat.points} pts</span>
              </div>
              <dd className="mt-1 text-xs text-muted-foreground">{cat.detail}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-xl font-semibold">Frequently asked questions</h2>
        <div className="flex flex-col gap-4">
          {FAQ_ITEMS.map((item) => (
            <div key={item.question}>
              <h3 className="text-sm font-medium">{item.question}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
