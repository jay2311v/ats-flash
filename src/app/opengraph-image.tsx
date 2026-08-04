import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 28,
          background: "#0a0f0e",
          padding: "0 96px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 92,
              height: 92,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#14231e",
              borderRadius: 24,
            }}
          >
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
              <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" fill="#2dd4bf" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, color: "#f4faf8" }}>
            ATS <span style={{ color: "#2dd4bf", marginLeft: 20 }}>Flash</span>
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 34, color: "#9fb8b0", maxWidth: 940 }}>
          Instant ATS score, category breakdown, and AI-powered suggestions for your resume.
        </div>
      </div>
    ),
    { ...size }
  );
}
