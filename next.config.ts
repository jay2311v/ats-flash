import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist's worker file is loaded via a runtime file path, which the
  // file tracer can't detect statically — include it explicitly so it's
  // present in serverless/standalone deployment output.
  outputFileTracingIncludes: {
    "/api/analyze": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
};

export default nextConfig;
