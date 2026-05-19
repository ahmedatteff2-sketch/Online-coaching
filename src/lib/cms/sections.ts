/**
 * Site-content (landing-page CMS) section registry.
 *
 * Each row in the `site_content` Postgres table has a `section_key` and a
 * `content_json` payload. The shape of `content_json` is determined by the
 * section_key. This module is the single source of truth for:
 *
 *   - what sections exist
 *   - what their JSON payload looks like (via the per-section *Content type)
 *   - what their default values are (used to render a fresh editor when a
 *     section row is missing or malformed)
 *
 * The seed migration `0004_seed_site_content.sql` inserts these rows on a
 * fresh project; defaults below mirror that seed so an admin who clears a
 * field can restore the original copy via the editor's Reset button.
 */
import type { Locale } from "@/lib/i18n/config";

// ---------------------------------------------------------------------------
// Section payload types
// ---------------------------------------------------------------------------

export interface HeroContent {
  headline_en: string;
  headline_ar: string;
  subheadline_en: string;
  subheadline_ar: string;
  cta_text_en: string;
  cta_text_ar: string;
  background_url: string;
}

export interface FeatureItem {
  icon: string;
  title_en: string;
  title_ar: string;
  desc_en: string;
  desc_ar: string;
}

export interface FeaturesContent {
  items: FeatureItem[];
}

export interface HowItWorksStep {
  title_en: string;
  title_ar: string;
  desc_en: string;
  desc_ar: string;
}

export interface HowItWorksContent {
  steps: HowItWorksStep[];
}

export interface TestimonialItem {
  name: string;
  quote_en: string;
  quote_ar: string;
  rating: number; // 1..5
  before_url: string;
  after_url: string;
}

export interface TestimonialsContent {
  items: TestimonialItem[];
}

export interface PricingTier {
  name_en: string;
  name_ar: string;
  price: string;
  currency: string;
  features_en: string;
  features_ar: string;
}

export interface PricingContent {
  tiers: PricingTier[];
}

export interface CtaFooterContent {
  headline_en: string;
  headline_ar: string;
  subheadline_en: string;
  subheadline_ar: string;
  cta_text_en: string;
  cta_text_ar: string;
}

export interface ThemeContent {
  primary: string;
  accent: string;
  background: string;
}

export type SectionKey =
  | "hero"
  | "features"
  | "how_it_works"
  | "testimonials"
  | "pricing"
  | "cta_footer"
  | "theme";

export interface SectionContentMap {
  hero: HeroContent;
  features: FeaturesContent;
  how_it_works: HowItWorksContent;
  testimonials: TestimonialsContent;
  pricing: PricingContent;
  cta_footer: CtaFooterContent;
  theme: ThemeContent;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const SECTION_DEFAULTS: SectionContentMap = {
  hero: {
    headline_en: "I build the training. You bring the work.",
    headline_ar: "أنا ببني تمرينك. إنت بس التزم.",
    subheadline_en:
      "Coach Ahmed — 1-on-1 online programming for people who are done starting over. Weekly check-ins, direct WhatsApp, and a plan that survives real life.",
    subheadline_ar:
      "كوتش أحمد — تدريب أونلاين واحد-لواحد لي اللي تعبوا يبتدوا من الصفر. متابعة أسبوعية، واتساب مباشر، وخطة بتعيش في جدولك فعلاً.",
    cta_text_en: "Apply for coaching",
    cta_text_ar: "قدّم للكوتشينج",
    background_url: "",
  },
  features: {
    items: [
      {
        icon: "Dumbbell",
        title_en: "Programming around your week",
        title_ar: "برنامج مبني على أسبوعك إنت",
        desc_en:
          "Three, four, or five days. Home or gym. Built for the schedule you actually have — not the one you wish you had.",
        desc_ar:
          "تلاتة أيام، أربعة، أو خمسة. بيت أو جيم. مبني على الجدول اللي عندك فعلاً — مش اللي نفسك فيه.",
      },
      {
        icon: "Apple",
        title_en: "Nutrition you can hold for a year",
        title_ar: "تغذية تقدر تكمل عليها سنة",
        desc_en:
          "Macros, not meal plans you'll quit by week two. We pick numbers, you pick the food.",
        desc_ar:
          "ماكروس، مش وجبات جاهزة هتتفرع منها بعد أسبوعين. أنا بحدد الأرقام، إنت بتختار الأكل.",
      },
      {
        icon: "MessageCircle",
        title_en: "Weekly check-in. Direct WhatsApp.",
        title_ar: "متابعة أسبوعية. واتساب مباشر.",
        desc_en:
          "You send a check-in once a week. I respond within 24 hours, with adjustments — not emojis.",
        desc_ar:
          "بتبعت تشيك-إن مرة في الأسبوع. برد في أقل من 24 ساعة، بتعديلات حقيقية — مش إيموجي.",
      },
    ],
  },
  how_it_works: {
    steps: [
      {
        title_en: "Apply",
        title_ar: "قدّم",
        desc_en:
          "Five-minute form. Goals, schedule, training history, the food you actually eat. No marketing fluff.",
        desc_ar:
          "فورم 5 دقايق. الهدف، الجدول، تاريخك في الجيم، والأكل اللي بتاكله فعلاً. مفيش كلام فاضي.",
      },
      {
        title_en: "Get your plan",
        title_ar: "استلم خطتك",
        desc_en:
          "Training split + macros + a short voice-note explaining why. Inside 48 hours of payment.",
        desc_ar:
          "برنامج تمرين + ماكروس + فيديو صوت قصير بشرح ليه بالشكل ده. في أقل من 48 ساعة من الدفع.",
      },
      {
        title_en: "Check in weekly",
        title_ar: "تابع أسبوعياً",
        desc_en:
          "Weight, photos, a few honest sentences. I review and adjust the plan — calories, volume, deloads.",
        desc_ar:
          "وزن، صور، وكلمتين صريحين. براجع وبعدل الخطة — سعرات، حجم تمرين، ديلود.",
      },
    ],
  },
  testimonials: {
    items: [],
  },
  pricing: {
    tiers: [],
  },
  cta_footer: {
    headline_en: "Last thing.",
    headline_ar: "حاجة أخيرة.",
    subheadline_en:
      "I take a small number of clients at a time so I can actually pay attention to each one. If you're done starting over, apply now.",
    subheadline_ar:
      "بشتغل مع عدد صغير في الوقت عشان أقدر أتابع كل واحد صح. لو تعبت تبتدي من الصفر مرة تانية، قدّم دلوقتي.",
    cta_text_en: "Apply for coaching",
    cta_text_ar: "قدّم للكوتشينج",
  },
  theme: {
    primary: "#DC2626",
    accent: "#FACC15",
    background: "#0A0A0A",
  },
};

// ---------------------------------------------------------------------------
// Section registry (display order, labels, helper metadata)
// ---------------------------------------------------------------------------

export interface SectionDescriptor {
  key: SectionKey;
  label_en: string;
  label_ar: string;
  description_en: string;
  description_ar: string;
  /** When false, this section is structural (e.g. theme) and is always shown
   *  in editor lists but never rendered as a public-facing page section. */
  rendersOnLanding: boolean;
}

export const SECTIONS: SectionDescriptor[] = [
  {
    key: "hero",
    label_en: "Hero",
    label_ar: "البانر الرئيسي",
    description_en: "Top of the landing page — headline, subheadline, CTA.",
    description_ar: "أعلى الصفحة — العنوان، الوصف، وزرار الدعوة للتسجيل.",
    rendersOnLanding: true,
  },
  {
    key: "features",
    label_en: "Features",
    label_ar: "المميزات",
    description_en: "Cards highlighting what's included in the program.",
    description_ar: "كروت بتعرض مميزات البرنامج.",
    rendersOnLanding: true,
  },
  {
    key: "how_it_works",
    label_en: "How it works",
    label_ar: "إزاي بيشتغل",
    description_en: "3-step explainer (Join → Plan → Transform).",
    description_ar: "٣ خطوات (التسجيل → الخطة → النتيجة).",
    rendersOnLanding: true,
  },
  {
    key: "testimonials",
    label_en: "Testimonials",
    label_ar: "آراء العملاء",
    description_en: "Client transformations + quotes (with star ratings).",
    description_ar: "تحولات وآراء العملاء (مع التقييم بالنجوم).",
    rendersOnLanding: true,
  },
  {
    key: "pricing",
    label_en: "Pricing",
    label_ar: "الأسعار",
    description_en: "Optional pricing tiers — hide via the publish toggle.",
    description_ar: "خطط الأسعار (اختياري) — اخفي القسم بزرار النشر.",
    rendersOnLanding: true,
  },
  {
    key: "cta_footer",
    label_en: "CTA Footer",
    label_ar: "دعوة التسجيل في النهاية",
    description_en: "Closing call-to-action above the page footer.",
    description_ar: "زرار التسجيل النهائي قبل الفوتر.",
    rendersOnLanding: true,
  },
  {
    key: "theme",
    label_en: "Theme colors",
    label_ar: "ألوان الموقع",
    description_en:
      "Primary / accent / background colors. Saved here for the design system; live application is wired in Phase 6.",
    description_ar:
      "اللون الأساسي والثانوي والخلفية. يتم تطبيقها على الموقع في المرحلة الأخيرة.",
    rendersOnLanding: false,
  },
];

export function getSectionDescriptor(
  key: string,
): SectionDescriptor | undefined {
  return SECTIONS.find((s) => s.key === key);
}

export function isValidSectionKey(key: string): key is SectionKey {
  return SECTIONS.some((s) => s.key === key);
}

// ---------------------------------------------------------------------------
// Locale-aware text picker
// ---------------------------------------------------------------------------

/**
 * Read `obj[base]_<locale>` with English fallback.
 *
 * Example: `pickLocaleText({ title_en: "Hi", title_ar: "أهلاً" }, "title", "ar")` → "أهلاً"
 */
export function pickLocaleText(
  obj: object | null | undefined,
  base: string,
  locale: Locale,
): string {
  if (!obj) return "";
  const record = obj as Record<string, unknown>;
  const localized = record[`${base}_${locale}`];
  if (typeof localized === "string" && localized.length > 0) return localized;
  const fallback = record[`${base}_en`];
  return typeof fallback === "string" ? fallback : "";
}

/**
 * Merge a partial/unknown JSON payload from the database with the section's
 * defaults so consumers always see fully-populated fields. Unknown keys in
 * the DB row are dropped (defensive — content shape is owned by this file).
 */
export function withDefaults<K extends SectionKey>(
  key: K,
  raw: unknown,
): SectionContentMap[K] {
  const defaults = SECTION_DEFAULTS[key];
  if (!raw || typeof raw !== "object") return defaults;
  // Shallow merge only at the top level — nested arrays/objects come from
  // raw verbatim if present, since they have admin-edited shape.
  return { ...defaults, ...(raw as object) } as SectionContentMap[K];
}
