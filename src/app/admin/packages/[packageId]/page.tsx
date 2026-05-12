import { notFound } from "next/navigation";
import { readLocaleFromCookie } from "@/lib/i18n/locale-cookie";
import { getPackage } from "@/lib/packages/queries";
import { PackageForm } from "@/components/admin/packages/package-form";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ packageId: string }>;
}

export default async function AdminPackageEditPage(props: Props) {
  const params = await props.params;
  const locale = readLocaleFromCookie();
  const pkg = await getPackage(params.packageId);
  if (!pkg) notFound();
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {t("Edit package", "تعديل الباقة")}
        </h1>
        <p className="text-muted-foreground">
          {locale === "ar" ? pkg.name_ar : pkg.name_en}
        </p>
      </div>
      <PackageForm initial={pkg} locale={locale} />
    </div>
  );
}
