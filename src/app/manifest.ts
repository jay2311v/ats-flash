import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ATS Flash – Free ATS Resume Checker & Score",
    short_name: "ATS Flash",
    description: "Upload your resume for an instant ATS score, category breakdown, and AI-powered suggestions.",
    start_url: "/",
    display: "standalone",
    background_color: "#14231e",
    theme_color: "#14231e",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
