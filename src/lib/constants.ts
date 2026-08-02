export const ACCEPTED_EXTENSIONS = ["pdf", "docx"] as const;
export type AcceptedExtension = (typeof ACCEPTED_EXTENSIONS)[number];

// Kept safely under Vercel's fixed ~4.5MB serverless function request body
// cap (not configurable via app code or vercel.json). Anything larger never
// reaches this route at all — the platform rejects it first with a raw,
// non-JSON "FUNCTION_PAYLOAD_TOO_LARGE" response — so the app's own limit
// has to sit below that line for its error message to ever be the one shown.
export const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4MB

export const SITE_URL = "https://www.atsflash.tech";
