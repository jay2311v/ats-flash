import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// No third-party scripts/styles/fonts are loaded (fonts are self-hosted by
// next/font, the only external HTTP call is server-side from the
// ai-suggestions route, not the browser), so this can stay strict without
// needing per-request nonces or dynamic rendering. 'unsafe-inline' is kept
// for style-src because the UI sets inline `style={{...}}` for computed
// score colors/widths; 'unsafe-eval' is dev-only (React's dev-mode eval for
// server error stack reconstruction — see Next's CSP guide).
//
// @vercel/analytics only needs the external va.vercel-scripts.com /
// vitals.vercel-insights.com domains in dev — once deployed on Vercel, both
// are proxied through the app's own origin, so 'self' already covers it.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval' https://va.vercel-scripts.com" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  connect-src 'self'${isDev ? " https://vitals.vercel-insights.com" : ""};
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-src 'none';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;

const nextConfig: NextConfig = {
  // Drops the `X-Powered-By: Next.js` header to reduce framework fingerprinting.
  poweredByHeader: false,

  // pdfjs-dist's worker file is loaded via a runtime file path, which the
  // file tracer can't detect statically — include it explicitly so it's
  // present in serverless/standalone deployment output.
  outputFileTracingIncludes: {
    "/api/analyze": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader.replace(/\s{2,}/g, " ").trim() },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()",
          },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
