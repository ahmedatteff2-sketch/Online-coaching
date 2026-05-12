import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import { isValidSectionKey, type SectionKey } from "@/lib/cms/sections";
import { loadSection } from "@/lib/cms/loader";
import { readLocaleFromCookie } from "@/lib/i18n/locale-cookie";
import type { Locale } from "@/lib/i18n/config";
import { HeroEditor } from "@/components/admin/cms/hero-editor";
import { FeaturesEditor } from "@/components/admin/cms/features-editor";
import { HowItWorksEditor } from "@/components/admin/cms/how-it-works-editor";
import { TestimonialsEditor } from "@/components/admin/cms/testimonials-editor";
import { PricingEditor } from "@/components/admin/cms/pricing-editor";
import { CtaFooterEditor } from "@/components/admin/cms/cta-footer-editor";
import { ThemeEditor } from "@/components/admin/cms/theme-editor";

export const dynamic = "force-dynamic";

type Params = Promise<{ section: string }>;

export default async function SiteContentSectionPage({
  params,
}: {
  params: Params;
}) {
  const { section } = await params;
  if (!isValidSectionKey(section)) {
    notFound();
  }
  const locale = readLocaleFromCookie();
  const data = await loadSection(section as SectionKey);
  const label =
    locale === "ar" ? data.descriptor.label_ar : data.descriptor.label_en;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/site-content"
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {locale === "ar" ? "رجوع لكل الأقسام" : "Back to all sections"}
          </Link>
          <h1 className="font-display text-2xl font-bold">{label}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {locale === "ar"
              ? data.descriptor.description_ar
              : data.descriptor.description_en}
          </p>
        </div>
        <Link
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-card/70"
        >
          <ExternalLink className="h-4 w-4" />
          {locale === "ar" ? "افتح الموقع المباشر" : "View live site"}
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card/40 p-6">
        {renderEditor(data.key, data.content, locale)}
      </div>
    </div>
  );
}

function renderEditor(key: SectionKey, content: unknown, locale: Locale) {
  switch (key) {
    case "hero":
      return <HeroEditor initial={content as never} locale={locale} />;
    case "features":
      return <FeaturesEditor initial={content as never} locale={locale} />;
    case "how_it_works":
      return <HowItWorksEditor initial={content as never} locale={locale} />;
    case "testimonials":
      return <TestimonialsEditor initial={content as never} locale={locale} />;
    case "pricing":
      return <PricingEditor initial={content as never} locale={locale} />;
    case "cta_footer":
      return <CtaFooterEditor initial={content as never} locale={locale} />;
    case "theme":
      return <ThemeEditor initial={content as never} locale={locale} />;
  }
}
