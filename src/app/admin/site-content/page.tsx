import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { loadAllSections } from "@/lib/cms/loader";
import { readLocaleFromCookie } from "@/lib/i18n/locale-cookie";
import type { Locale } from "@/lib/i18n/config";
import { SectionPublishToggle } from "@/components/admin/cms/section-publish-toggle";
import { formatDate } from "@/lib/utils";
import type { SectionDescriptor } from "@/lib/cms/sections";

export const dynamic = "force-dynamic";

export default async function SiteContentPage() {
  const locale = readLocaleFromCookie();
  const sections = await loadAllSections();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">
            {locale === "ar" ? "محتوى الموقع" : "Site content"}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {locale === "ar"
              ? "حرر أقسام الصفحة الرئيسية. كل تعديل بيتنشر على الموقع المباشر فوراً بعد الحفظ."
              : "Edit each landing-page section. Saving publishes changes to the live site instantly."}
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

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-start">
                {locale === "ar" ? "القسم" : "Section"}
              </th>
              <th className="px-4 py-3 text-start">
                {locale === "ar" ? "الوصف" : "Description"}
              </th>
              <th className="px-4 py-3 text-start">
                {locale === "ar" ? "آخر تحديث" : "Last updated"}
              </th>
              <th className="px-4 py-3 text-start">
                {locale === "ar" ? "النشر" : "Published"}
              </th>
              <th className="px-4 py-3 text-end">
                <span className="sr-only">
                  {locale === "ar" ? "تحرير" : "Edit"}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sections.map((s) => (
              <tr
                key={s.key}
                className="border-t border-border/60 hover:bg-card/30"
              >
                <td className="px-4 py-3 font-medium">
                  {labelFor(s.descriptor, locale)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {descriptionFor(s.descriptor, locale)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {s.updatedAt
                    ? formatDate(s.updatedAt, locale)
                    : locale === "ar"
                      ? "—"
                      : "Never"}
                </td>
                <td className="px-4 py-3">
                  <SectionPublishToggle
                    sectionKey={s.key}
                    initialPublished={s.isPublished}
                    locale={locale}
                  />
                </td>
                <td className="px-4 py-3 text-end">
                  <Link
                    href={`/admin/site-content/${s.key}`}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    {locale === "ar" ? "تحرير" : "Edit"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function labelFor(d: SectionDescriptor, locale: Locale): string {
  return locale === "ar" ? d.label_ar : d.label_en;
}

function descriptionFor(d: SectionDescriptor, locale: Locale): string {
  return locale === "ar" ? d.description_ar : d.description_en;
}
