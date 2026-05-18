import Link from "next/link";
import Image from "next/image";
import { loadAllSections } from "@/lib/cms/loader";
import { pickLocaleText } from "@/lib/cms/sections";
import { readLocaleFromCookie } from "@/lib/i18n/locale-cookie";
import { Reveal } from "@/components/ui/reveal";
import { listActivePackages } from "@/lib/packages/queries";
import { formatBillingPeriod } from "@/lib/packages/format";
import { JsonLd } from "@/components/seo/json-ld";
import { SITE_DEFAULT_DESCRIPTION, SITE_NAME, siteUrl } from "@/lib/seo/site";
import type {
  CtaFooterContent,
  FeaturesContent,
  HeroContent,
  HowItWorksContent,
  PricingContent,
  TestimonialsContent,
} from "@/lib/cms/sections";

// FAQ is hand-curated rather than CMS-driven so the voice stays consistent
// even before an admin touches the seed. Bilingual entries keep things honest.
const FAQ = [
  {
    q_en: "How is this different from a downloadable PDF program?",
    q_ar: "إيه الفرق بين ده وبرنامج PDF بتنزّله من النت؟",
    a_en: "A PDF doesn't see your last check-in. Your training, calories, and recovery get adjusted every week based on what you actually did — sleep, soreness, life. Not a guess.",
    a_ar: "الـ PDF مش بيشوف تشيك-إنك الأخير. التمرين والسعرات والاستشفاء بيتعدلوا كل أسبوع على أساس اللي حصل فعلاً — النوم، التعب، الحياة. مش تخمين.",
  },
  {
    q_en: "Do I need a gym?",
    q_ar: "محتاج جيم؟",
    a_en: "No. Tell me what you have at home (a pair of dumbbells, a pull-up bar, nothing) and I'll build around it. We can swap in gym work whenever it makes sense.",
    a_ar: "لا. قولي عندك إيه في البيت (زوج دامبل، عقلة، ولا حاجة) وأنا بابني حواليه. نقدر نضيف جيم بعدين لو ناسب.",
  },
  {
    q_en: "What if I miss a week?",
    q_ar: "لو طوّلت أسبوع من غير ما أتمرن؟",
    a_en: "Life happens. We adjust, we don't reset. The plan is built to survive bad weeks — not punish you for them.",
    a_ar: "بيحصل. بنعدّل، مش بنرجع من الأول. الخطة مبنية تعدّي الأسابيع الوحشة — مش تعاقبك عليها.",
  },
  {
    q_en: "How do I pay?",
    q_ar: "بأدفع إزاي؟",
    a_en: "Vodafone Cash or InstaPay for clients in Egypt. International clients can use a card. Details after your application is approved.",
    a_ar: "فودافون كاش أو InstaPay داخل مصر. الكروت لبرّه. التفاصيل بتيجي بعد ما الفورم يتقبل.",
  },
];

export default async function LandingPage() {
  const locale = readLocaleFromCookie();
  const isAr = locale === "ar";
  const [sections, packages] = await Promise.all([
    loadAllSections(),
    listActivePackages(),
  ]);

  // Build a key → published-content lookup for ergonomic access below.
  // Sections that are unpublished are skipped here so they don't render.
  const published = new Map(
    sections.filter((s) => s.isPublished).map((s) => [s.key, s.content]),
  );

  const hero = published.get("hero") as HeroContent | undefined;
  const features = published.get("features") as FeaturesContent | undefined;
  const howItWorks = published.get("how_it_works") as
    | HowItWorksContent
    | undefined;
  const testimonials = published.get("testimonials") as
    | TestimonialsContent
    | undefined;
  const pricing = published.get("pricing") as PricingContent | undefined;
  const pricingPublished = sections.find(
    (s) => s.key === "pricing",
  )?.isPublished;
  const ctaFooter = published.get("cta_footer") as CtaFooterContent | undefined;

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl(),
    description: SITE_DEFAULT_DESCRIPTION,
  } as const;
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Online fitness & nutrition coaching",
    serviceType: "Online personal coaching",
    provider: { "@type": "Organization", name: SITE_NAME, url: siteUrl() },
    areaServed: "Worldwide",
    description: SITE_DEFAULT_DESCRIPTION,
  } as const;

  // Quick rolling stats strip used in the hero. Plain numbers, no emoji.
  const tickerEn = [
    "1-ON-1 PROGRAMMING",
    "WEEKLY CHECK-INS",
    "DIRECT WHATSAPP",
    "100+ CLIENTS COACHED",
    "BASED IN CAIRO · WORKING WORLDWIDE",
    "NO BOTS · NO FLUFF",
  ];
  const tickerAr = [
    "تدريب واحد-لواحد",
    "متابعة أسبوعية",
    "واتساب مباشر",
    "أكتر من ١٠٠ عميل",
    "من القاهرة · للعالم كله",
    "مفيش بوتات · مفيش كلام فاضي",
  ];
  const ticker = isAr ? tickerAr : tickerEn;

  return (
    <div className="relative">
      <JsonLd data={orgJsonLd} />
      <JsonLd data={serviceJsonLd} />

      {/* ───────────────────────────── Hero ───────────────────────────── */}
      {hero && (
        <section className="relative overflow-hidden border-b border-border">
          {hero.background_url && (
            <Image
              src={hero.background_url}
              alt=""
              fill
              priority
              sizes="100vw"
              className="pointer-events-none object-cover opacity-25"
            />
          )}

          <div className="container relative grid gap-10 py-16 md:grid-cols-[1.4fr_1fr] md:items-end md:gap-12 md:py-24">
            {/* Left column — type-driven, no badge, no gradient blob */}
            <div className="flex flex-col gap-6">
              <div className="flex items-baseline gap-3 font-display text-xs tracking-[0.22em] text-muted-foreground">
                <span className="text-primary">/ 01</span>
                <span>
                  {isAr ? "كوتش أحمد · القاهرة" : "COACH AHMED · CAIRO"}
                </span>
              </div>

              {(() => {
                // Split the headline on its first period so we can colour the
                // two halves separately (no extra "." artefacts). Falls back to
                // sensible defaults when no period is present.
                const raw = pickLocaleText(hero, "headline", locale) ?? "";
                const trimmed = raw.replace(/\.+$/, "");
                const firstDot = trimmed.indexOf(".");
                const fallbackA = isAr
                  ? "أنا ببني تمرينك"
                  : "I build the training";
                const fallbackB = isAr ? "إنت بس التزم" : "You bring the work";
                const lineA =
                  firstDot >= 0 ? trimmed.slice(0, firstDot) : trimmed;
                const lineB =
                  firstDot >= 0 ? trimmed.slice(firstDot + 1).trim() : "";
                return (
                  <h1 className="font-display text-[14vw] leading-[0.85] tracking-tight md:text-[10rem]">
                    <span className="block">
                      {lineA || fallbackA}
                      <span className="text-primary">.</span>
                    </span>
                    <span className="block text-muted-foreground">
                      {lineB || fallbackB}
                      <span className="text-foreground">.</span>
                    </span>
                  </h1>
                );
              })()}

              <p className="max-w-xl text-base text-muted-foreground md:text-lg">
                {pickLocaleText(hero, "subheadline", locale)}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-4">
                <Link
                  href="/apply"
                  className="group inline-flex items-center gap-3 bg-primary px-6 py-4 font-display text-base tracking-wider text-primary-foreground transition-colors hover:bg-foreground hover:text-background"
                >
                  {pickLocaleText(hero, "cta_text", locale) ||
                    (isAr ? "قدّم للكوتشينج" : "APPLY FOR COACHING")}
                  <span
                    aria-hidden
                    className="transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                  >
                    →
                  </span>
                </Link>
                <Link
                  href="#how"
                  className="text-sm text-muted-foreground underline decoration-border decoration-2 underline-offset-[6px] hover:text-foreground hover:decoration-primary"
                >
                  {isAr ? "أعرف الطريقة الأول" : "See how I work first"}
                </Link>
              </div>
            </div>

            {/* Right column — coach photo slot. Falls back to a typographic
                block so the layout stays sharp without uploaded assets. */}
            <div className="relative aspect-[3/4] w-full overflow-hidden border border-border bg-card">
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <p className="font-display text-[18vw] leading-none text-foreground/[0.04] md:text-[12rem]">
                    A.
                  </p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5">
                <p className="font-display text-2xl tracking-tight">
                  {isAr ? "أحمد" : "AHMED"}
                </p>
                <p className="text-xs tracking-[0.18em] text-muted-foreground">
                  {isAr
                    ? "كوتش معتمد · ٨ سنين خبرة"
                    : "CERTIFIED COACH · 8 YEARS IN"}
                </p>
              </div>
              {/* Corner ticks — small print details that AI templates skip */}
              <span className="absolute left-3 top-3 font-display text-[10px] tracking-[0.22em] text-muted-foreground">
                COACH / 001
              </span>
              <span className="absolute right-3 top-3 font-display text-[10px] tracking-[0.22em] text-muted-foreground">
                EST. 2017
              </span>
            </div>
          </div>

          {/* Marquee ticker strip — the kind of detail no generator picks */}
          <div className="overflow-hidden border-t border-border bg-foreground text-background">
            <div className="flex animate-ticker whitespace-nowrap py-3 font-display text-sm tracking-[0.25em]">
              {[...ticker, ...ticker, ...ticker, ...ticker].map((label, i) => (
                <span key={i} className="px-8">
                  {label}
                  <span aria-hidden className="ms-8 text-primary">
                    ✦
                  </span>
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────── How I work ─────────────────────── */}
      {howItWorks && howItWorks.steps.length > 0 && (
        <section id="how" className="border-b border-border py-20 md:py-28">
          <div className="container">
            <div className="mb-12 flex items-baseline gap-4 font-display text-xs tracking-[0.22em] text-muted-foreground">
              <span className="text-primary">/ 02</span>
              <span>{isAr ? "إزاي بشتغل" : "HOW I WORK"}</span>
            </div>

            <h2 className="mb-16 max-w-3xl font-display text-5xl leading-[0.95] tracking-tight md:text-7xl">
              {isAr ? (
                <>
                  مفيش <span className="text-primary">قوالب</span> جاهزة.
                  <br />
                  مفيش بوتات. كله أنا.
                </>
              ) : (
                <>
                  No <span className="text-primary">templates</span>.
                  <br />
                  No bots. Just me.
                </>
              )}
            </h2>

            <ol className="grid gap-0 md:grid-cols-3">
              {howItWorks.steps.map((step, i) => {
                const title = pickLocaleText(step, "title", locale);
                const desc = pickLocaleText(step, "desc", locale);
                const isLast = i === howItWorks.steps.length - 1;
                return (
                  <Reveal
                    as="li"
                    key={`${title}-${i}`}
                    delay={i * 0.08}
                    className={`flex flex-col gap-4 py-8 md:px-8 md:py-0 ${
                      !isLast ? "border-b border-border md:border-b-0" : ""
                    } ${
                      i > 0
                        ? "md:border-l md:border-border rtl:md:border-l-0 rtl:md:border-r"
                        : ""
                    }`}
                  >
                    <div className="flex items-baseline gap-3">
                      <span className="font-display text-6xl leading-none text-primary md:text-7xl">
                        0{i + 1}
                      </span>
                      <span className="font-display text-xs tracking-[0.22em] text-muted-foreground">
                        {isAr ? "خطوة" : "STEP"}
                      </span>
                    </div>
                    <h3 className="font-display text-2xl tracking-tight md:text-3xl">
                      {title}
                    </h3>
                    <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                      {desc}
                    </p>
                  </Reveal>
                );
              })}
            </ol>
          </div>
        </section>
      )}

      {/* ─────────────────────────── What you get ─────────────────────── */}
      {features && features.items.length > 0 && (
        <section className="border-b border-border bg-card/30 py-20 md:py-28">
          <div className="container">
            <div className="mb-12 flex items-baseline gap-4 font-display text-xs tracking-[0.22em] text-muted-foreground">
              <span className="text-primary">/ 03</span>
              <span>{isAr ? "اللي بتاخده" : "WHAT YOU GET"}</span>
            </div>

            <div className="grid gap-12 md:grid-cols-3 md:gap-8">
              {features.items.map((item, i) => {
                const title = pickLocaleText(item, "title", locale);
                const desc = pickLocaleText(item, "desc", locale);
                return (
                  <Reveal
                    key={`${title}-${i}`}
                    delay={i * 0.07}
                    className="flex flex-col gap-4"
                  >
                    {/* Big number doing the work of an icon. */}
                    <span className="font-display text-[5rem] leading-[0.8] text-foreground/10">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="-mt-2 h-px w-12 bg-primary" />
                    <h3 className="font-display text-2xl tracking-tight md:text-3xl">
                      {title}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {desc}
                    </p>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────── Real transformations ─────────────────── */}
      {testimonials && testimonials.items.length > 0 && (
        <section className="border-b border-border py-20 md:py-28">
          <div className="container">
            <div className="mb-12 flex items-baseline gap-4 font-display text-xs tracking-[0.22em] text-muted-foreground">
              <span className="text-primary">/ 04</span>
              <span>{isAr ? "نتايج حقيقية" : "REAL CLIENTS"}</span>
            </div>

            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.items.map((t, i) => {
                const quote = pickLocaleText(t, "quote", locale);
                return (
                  <Reveal
                    as="article"
                    key={`${t.name}-${i}`}
                    delay={i * 0.07}
                    className="group flex flex-col gap-4"
                  >
                    {(t.before_url || t.after_url) && (
                      <div className="grid grid-cols-2 gap-1">
                        {t.before_url && (
                          <div className="relative aspect-[3/4] overflow-hidden border border-border">
                            <Image
                              src={t.before_url}
                              alt={`${t.name} before`}
                              fill
                              sizes="(min-width: 1024px) 220px, 50vw"
                              className="object-cover grayscale transition-transform duration-500 group-hover:scale-105"
                            />
                            <span className="absolute bottom-2 left-2 bg-background/90 px-2 py-1 font-display text-[10px] tracking-[0.22em]">
                              {isAr ? "قبل" : "BEFORE"}
                            </span>
                          </div>
                        )}
                        {t.after_url && (
                          <div className="relative aspect-[3/4] overflow-hidden border border-primary">
                            <Image
                              src={t.after_url}
                              alt={`${t.name} after`}
                              fill
                              sizes="(min-width: 1024px) 220px, 50vw"
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <span className="absolute bottom-2 left-2 bg-primary px-2 py-1 font-display text-[10px] tracking-[0.22em] text-primary-foreground">
                              {isAr ? "بعد" : "AFTER"}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    <blockquote className="text-base leading-relaxed text-foreground">
                      “{quote}”
                    </blockquote>
                    <p className="font-display text-sm tracking-[0.18em] text-muted-foreground">
                      — {t.name.toUpperCase()}
                    </p>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─────────────────────────── Pricing ─────────────────────────── */}
      {pricingPublished !== false &&
        (packages.length > 0 ? (
          <section
            id="packages"
            className="border-b border-border bg-card/30 py-20 md:py-28"
          >
            <div className="container">
              <div className="mb-12 flex items-baseline gap-4 font-display text-xs tracking-[0.22em] text-muted-foreground">
                <span className="text-primary">/ 05</span>
                <span>{isAr ? "الباقات" : "PACKAGES"}</span>
              </div>

              <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
                <h2 className="max-w-2xl font-display text-5xl leading-[0.95] tracking-tight md:text-6xl">
                  {isAr ? (
                    <>
                      عقد <span className="text-primary">واضح</span>،<br />
                      من غير surprises.
                    </>
                  ) : (
                    <>
                      A clean <span className="text-primary">contract</span>.
                      <br />
                      No surprises.
                    </>
                  )}
                </h2>
                <Link
                  href="/packages"
                  className="text-sm text-muted-foreground underline decoration-border decoration-2 underline-offset-[6px] hover:text-foreground hover:decoration-primary"
                >
                  {isAr ? "كل التفاصيل ←" : "Full breakdown →"}
                </Link>
              </div>

              <div className="grid gap-0 border border-border md:grid-cols-3">
                {packages.slice(0, 3).map((p, i) => {
                  const name = isAr ? p.name_ar : p.name_en;
                  const description = isAr
                    ? p.description_ar
                    : p.description_en;
                  const featureList =
                    (isAr ? p.features_ar : p.features_en) ?? [];
                  const ctaLabel =
                    (isAr ? p.cta_label_ar : p.cta_label_en) ||
                    (isAr ? "ابدأ هنا" : "Start here");
                  const isFeatured = p.is_featured;
                  return (
                    <Reveal
                      key={p.id}
                      delay={i * 0.06}
                      className={[
                        "relative flex flex-col gap-5 p-8",
                        i > 0
                          ? "border-t border-border md:border-l md:border-t-0 rtl:md:border-l-0 rtl:md:border-r"
                          : "",
                        isFeatured ? "bg-background" : "",
                      ].join(" ")}
                    >
                      {isFeatured && (
                        <span className="absolute -top-px left-0 bg-primary px-3 py-1 font-display text-[11px] tracking-[0.22em] text-primary-foreground">
                          {isAr ? "موصى به" : "RECOMMENDED"}
                        </span>
                      )}
                      <div>
                        <p className="font-display text-xs tracking-[0.22em] text-muted-foreground">
                          {isAr ? `باقة 0${i + 1}` : `PACKAGE 0${i + 1}`}
                        </p>
                        <h3 className="mt-2 font-display text-3xl tracking-tight">
                          {name}
                        </h3>
                        {description && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-5xl leading-none">
                          {p.price > 0 ? p.price : isAr ? "مخصص" : "Custom"}
                        </span>
                        {p.price > 0 && (
                          <span className="text-sm text-muted-foreground">
                            {p.currency} /{" "}
                            {formatBillingPeriod(p.billing_period, locale)}
                          </span>
                        )}
                      </div>
                      {featureList.length > 0 && (
                        <ul className="flex flex-col gap-2 text-sm">
                          {featureList.slice(0, 6).map((f, k) => (
                            <li key={k} className="flex items-start gap-3">
                              <span
                                aria-hidden
                                className="mt-2 inline-block h-1.5 w-1.5 flex-shrink-0 bg-primary"
                              />
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Link
                        href={`/apply?package_id=${p.id}`}
                        className={[
                          "mt-auto inline-flex items-center justify-between border px-4 py-3 font-display text-sm tracking-wider transition-colors",
                          isFeatured
                            ? "border-primary bg-primary text-primary-foreground hover:bg-foreground hover:text-background"
                            : "border-border bg-transparent text-foreground hover:border-primary hover:bg-primary hover:text-primary-foreground",
                        ].join(" ")}
                      >
                        {ctaLabel.toUpperCase()}
                        <span aria-hidden>→</span>
                      </Link>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </section>
        ) : (
          pricing &&
          pricing.tiers.length > 0 && (
            <section
              id="packages"
              className="border-b border-border bg-card/30 py-20 md:py-28"
            >
              <div className="container">
                <div className="mb-12 flex items-baseline gap-4 font-display text-xs tracking-[0.22em] text-muted-foreground">
                  <span className="text-primary">/ 05</span>
                  <span>{isAr ? "الباقات" : "PACKAGES"}</span>
                </div>

                <h2 className="mb-16 max-w-2xl font-display text-5xl leading-[0.95] tracking-tight md:text-6xl">
                  {isAr
                    ? "عقد واضح، من غير surprises."
                    : "A clean contract. No surprises."}
                </h2>

                <div className="grid gap-0 border border-border md:grid-cols-3">
                  {pricing.tiers.map((tier, i) => {
                    const name = pickLocaleText(tier, "name", locale);
                    const featuresText = pickLocaleText(
                      tier,
                      "features",
                      locale,
                    );
                    return (
                      <article
                        key={`${name}-${i}`}
                        className={`flex flex-col gap-5 p-8 ${
                          i > 0
                            ? "border-t border-border md:border-l md:border-t-0 rtl:md:border-l-0 rtl:md:border-r"
                            : ""
                        }`}
                      >
                        <p className="font-display text-xs tracking-[0.22em] text-muted-foreground">
                          {isAr ? `باقة 0${i + 1}` : `PACKAGE 0${i + 1}`}
                        </p>
                        <h3 className="font-display text-3xl tracking-tight">
                          {name}
                        </h3>
                        <div className="flex items-baseline gap-2">
                          <span className="font-display text-5xl leading-none">
                            {tier.price}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {tier.currency}
                          </span>
                        </div>
                        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                          {featuresText
                            .split("\n")
                            .filter(Boolean)
                            .map((line, k) => (
                              <li key={k} className="flex items-start gap-3">
                                <span
                                  aria-hidden
                                  className="mt-2 inline-block h-1.5 w-1.5 flex-shrink-0 bg-primary"
                                />
                                <span>{line}</span>
                              </li>
                            ))}
                        </ul>
                        <Link
                          href="/apply"
                          className="mt-auto inline-flex items-center justify-between border border-border px-4 py-3 font-display text-sm tracking-wider transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
                        >
                          {(isAr ? "قدّم" : "APPLY").toUpperCase()}
                          <span aria-hidden>→</span>
                        </Link>
                      </article>
                    );
                  })}
                </div>
              </div>
            </section>
          )
        ))}

      {/* ─────────────────────────────── FAQ ─────────────────────────── */}
      <section id="faq" className="border-b border-border py-20 md:py-28">
        <div className="container">
          <div className="mb-12 flex items-baseline gap-4 font-display text-xs tracking-[0.22em] text-muted-foreground">
            <span className="text-primary">/ 06</span>
            <span>
              {isAr ? "الأسئلة اللي بتيجي قبل ما تقدّم" : "BEFORE YOU APPLY"}
            </span>
          </div>

          <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
            <h2 className="font-display text-5xl leading-[0.95] tracking-tight md:text-7xl">
              {isAr ? (
                <>
                  أسئلة
                  <br />
                  <span className="text-primary">صريحة</span>.
                </>
              ) : (
                <>
                  Honest
                  <br />
                  <span className="text-primary">questions</span>.
                </>
              )}
            </h2>

            <dl className="divide-y divide-border border-y border-border">
              {FAQ.map((item, i) => (
                <details
                  key={i}
                  className="group py-5 [&_summary::-webkit-details-marker]:hidden"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-6">
                    <dt className="font-display text-lg tracking-tight md:text-xl">
                      <span className="me-3 text-primary">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {isAr ? item.q_ar : item.q_en}
                    </dt>
                    <span
                      aria-hidden
                      className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center border border-border text-lg transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <dd className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {isAr ? item.a_ar : item.a_en}
                  </dd>
                </details>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ─────────────────────────── CTA footer ─────────────────────── */}
      {ctaFooter && (
        <section className="relative overflow-hidden bg-foreground text-background">
          <div className="container relative grid gap-8 py-20 md:grid-cols-[2fr_1fr] md:items-end md:py-28">
            <div>
              <p className="font-display text-xs tracking-[0.22em] text-background/60">
                / 07 — {isAr ? "آخر حاجة" : "ONE LAST THING"}
              </p>
              <h2 className="mt-4 max-w-2xl font-display text-6xl leading-[0.9] tracking-tight md:text-8xl">
                {pickLocaleText(ctaFooter, "headline", locale)}
              </h2>
              <p className="mt-6 max-w-xl text-base text-background/70">
                {pickLocaleText(ctaFooter, "subheadline", locale)}
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-end">
              <Link
                href="/apply"
                className="group inline-flex items-center gap-3 bg-primary px-8 py-5 font-display text-lg tracking-wider text-primary-foreground transition-colors hover:bg-background hover:text-foreground"
              >
                {pickLocaleText(ctaFooter, "cta_text", locale) ||
                  (isAr ? "قدّم دلوقتي" : "APPLY NOW")}
                <span
                  aria-hidden
                  className="transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
                >
                  →
                </span>
              </Link>
              <p className="text-xs tracking-[0.18em] text-background/60">
                {isAr ? "بياخد ٥ دقايق" : "TAKES 5 MINUTES"}
              </p>
            </div>
          </div>

          {/* Oversized typographic mark anchored to the bottom edge. */}
          <p
            aria-hidden
            className="pointer-events-none select-none whitespace-nowrap font-display text-[22vw] leading-[0.78] text-background/[0.06]"
          >
            AHMED · AHMED · AHMED
          </p>
        </section>
      )}
    </div>
  );
}
