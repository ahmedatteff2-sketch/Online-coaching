import { withSentryConfig } from "@sentry/nextjs";

// =============================================================================
// Content-Security-Policy
// =============================================================================
// Emitted in **Report-Only** mode so we don't break the app while we shake
// out which third-party origins each page actually loads. Move to enforcing
// mode (`Content-Security-Policy` header) once the report endpoint has
// confirmed zero violations for the relevant paths.
//
// Origins:
//   - `*.supabase.co` / `*.supabase.in`  : Postgres REST + Storage
//   - `*.sentry.io`                       : crash reporting (optional)
//   - `challenges.cloudflare.com`         : Turnstile widget
//   - `www.youtube-nocookie.com`          : embedded workout videos
//   - `i.ytimg.com`                       : YouTube thumbnails
//   - `data:` / `blob:`                   : Next.js image optimizer + uploads
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "form-action 'self'",
  // Allow inline + eval for now because Next.js / Sentry inject some
  // inline boot scripts. We'll tighten with nonces once we move to
  // enforcing mode.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://images.unsplash.com https://i.imgur.com https://res.cloudinary.com https://i.ytimg.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.supabase.in wss://*.supabase.in https://*.sentry.io https://challenges.cloudflare.com",
  "frame-src https://www.youtube-nocookie.com https://challenges.cloudflare.com",
  "media-src 'self' https://*.supabase.co https://*.supabase.in",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

// Default response headers applied to every route. These are the
// industry-standard "low blast-radius" security headers that protect against
// clickjacking, MIME sniffing, and over-broad referrer leakage.
const securityHeaders = [
  // Tell browsers to keep using HTTPS for two years and pre-load. Only
  // emitted in production responses; on http://localhost the browser ignores
  // it.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Block <iframe> framing of the app from other origins (clickjacking).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Disable MIME sniffing (defense-in-depth against XSS via wrong types).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send the origin only on cross-origin navigations, never the full path.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable powerful browser features the app does not use. We aim wide so
  // a future bundled dependency can't quietly start asking the user for
  // sensor / device access without an explicit allowlist change.
  {
    key: "Permissions-Policy",
    value: [
      "accelerometer=()",
      "ambient-light-sensor=()",
      "autoplay=(self)",
      "battery=()",
      "camera=()",
      "display-capture=()",
      "document-domain=()",
      "encrypted-media=()",
      "fullscreen=(self)",
      "geolocation=()",
      "gyroscope=()",
      "hid=()",
      "identity-credentials-get=()",
      "idle-detection=()",
      "magnetometer=()",
      "microphone=()",
      "midi=()",
      "payment=()",
      "picture-in-picture=(self)",
      "publickey-credentials-get=()",
      "screen-wake-lock=()",
      "serial=()",
      "sync-xhr=()",
      "usb=()",
      "web-share=(self)",
      "xr-spatial-tracking=()",
    ].join(", "),
  },
  // Cross-origin opener / resource isolation hardening.
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Emit CSP in report-only mode so violations are visible in the
  // browser console without breaking the app. Flip to
  // `Content-Security-Policy` once the report stream is clean.
  { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // CMS rows let admins paste arbitrary image URLs (transformation photos,
    // hero backgrounds). We allow Supabase Storage for client-uploaded
    // assets, plus a small set of common CDNs the marketing team uses. To
    // accept additional image hosts in production, set
    // NEXT_PUBLIC_IMAGE_HOSTS to a comma-separated list of hostnames.
    remotePatterns: [
      // Supabase Storage object URLs (any project).
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
      // Common image CDNs used by the CMS.
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.imgur.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      ...(process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "")
        .split(",")
        .map((h) => h.trim())
        .filter(Boolean)
        .map((hostname) => ({ protocol: "https", hostname })),
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

// Only wrap when a Sentry DSN is configured so local builds don't depend on
// Sentry env vars. When wrapped, Sentry uploads source maps if
// SENTRY_AUTH_TOKEN is set; otherwise it skips upload silently.
const sentryEnabled = Boolean(
  process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
);

export default sentryEnabled
  ? withSentryConfig(nextConfig, {
      // Sentry org / project for source map upload. Pulled from env so the
      // values aren't hard-coded in the repo.
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      // Suppress Sentry build logs unless an upload happens.
      silent: !process.env.CI,
      // Disable source map upload entirely when no auth token is set.
      sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
      // Don't tunnel events through a Next.js route by default — keeps the
      // setup simple. Flip on if you need to evade ad blockers.
      tunnelRoute: undefined,
      // Hides source map upload progress from Vercel/Render build logs.
      hideSourceMaps: true,
      disableLogger: true,
      // Use the edge runtime instrumentation hook.
      automaticVercelMonitors: false,
    })
  : nextConfig;
