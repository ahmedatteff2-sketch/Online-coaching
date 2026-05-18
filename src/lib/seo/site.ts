// Resolve the public site URL with a sensible fallback for local dev.
// Set NEXT_PUBLIC_SITE_URL in production (no trailing slash).
export function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export const SITE_NAME = "Coach Ahmed";
export const SITE_DEFAULT_TITLE =
  "Coach Ahmed — 1-on-1 online training & nutrition";
export const SITE_DEFAULT_DESCRIPTION =
  "Train with Ahmed. Plans built for your schedule, your body, and your life — with weekly check-ins and direct WhatsApp support. Apply in five minutes.";

// Static keyword list for the root layout. Search engines mostly ignore the
// keywords meta tag now, but a curated set still helps internal SEO tooling
// and AI-driven crawlers.
export const SITE_KEYWORDS = [
  "online coaching",
  "fitness coaching",
  "nutrition coaching",
  "personal trainer",
  "diet plan",
  "weight loss coach",
  "muscle gain",
  "coach ahmed",
  "تدريب أونلاين",
  "كوتشينج لياقة",
  "تغذية أونلاين",
  "مدرب شخصي",
  "خطة تمرين",
  "كوتش أحمد",
  "مدرب لياقة في مصر",
];
