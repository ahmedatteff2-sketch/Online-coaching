import type { Metadata } from "next";
import { Suspense } from "react";
import { listActivePackages } from "@/lib/packages/queries";
import { readLocaleFromCookie } from "@/lib/i18n/locale-cookie";
import { ApplyForm } from "@/components/apply/apply-form";
import { siteUrl } from "@/lib/seo/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Apply for coaching",
  description:
    "Tell us about your goals, training history, and lifestyle so the coach can build a plan tailored to you. Takes about 5 minutes.",
  alternates: { canonical: `${siteUrl()}/apply` },
  openGraph: {
    title: "Apply for coaching",
    description:
      "Submit your application — goals, training history, and lifestyle. The coach will reach out to confirm.",
    url: `${siteUrl()}/apply`,
    type: "website",
  },
  // Discourage indexing of the form variants — keep the canonical /apply
  // entry in search results without ?package_id query strings.
  robots: { index: true, follow: true },
};

interface Props {
  searchParams: Promise<{ package_id?: string }>;
}

export default async function ApplyPage(props: Props) {
  const searchParams = await props.searchParams;
  const locale = readLocaleFromCookie();
  const packages = await listActivePackages();
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const initialPackageId = searchParams.package_id ?? "";

  return (
    <div className="container max-w-3xl py-12">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold md:text-4xl">
          {t("Coaching application", "فورم الاشتراك في الكوتشينج")}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t(
            "Tell us about yourself so we can build a plan that actually fits you. The coach will reach out personally to confirm.",
            "اكتبلنا كل المعلومات اللي محتاجينها عشان نبني خطة تناسبك فعلاً. الكوتش هيتواصل معاك بشكل شخصي للتأكيد.",
          )}
        </p>
      </div>

      <Suspense>
        <ApplyForm
          locale={locale}
          packages={packages}
          initialPackageId={initialPackageId}
          turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
        />
      </Suspense>
    </div>
  );
}
