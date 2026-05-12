import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getClientDetail } from "@/lib/clients/queries";
import { getActiveNutritionPlan, listFoods } from "@/lib/nutrition/queries";
import { readLocaleFromCookie } from "@/lib/i18n/locale-cookie";
import { NutritionPlanEditor } from "@/components/admin/nutrition/nutrition-plan-editor";

export const dynamic = "force-dynamic";

export default async function ClientNutritionPage(
  props: {
    params: Promise<{ clientId: string }>;
  }
) {
  const params = await props.params;
  const detail = await getClientDetail(params.clientId);
  if (!detail) notFound();
  const locale = readLocaleFromCookie();
  const [plan, foods] = await Promise.all([
    getActiveNutritionPlan(params.clientId),
    listFoods(),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href={`/admin/clients/${params.clientId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {locale === "ar" ? "ملف العميل" : "Client profile"}
      </Link>

      <div>
        <p className="text-sm text-muted-foreground">
          {detail.profile.full_name ?? detail.profile.email}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {locale === "ar" ? "خطة التغذية" : "Nutrition plan"}
        </h1>
      </div>

      <NutritionPlanEditor
        clientId={params.clientId}
        locale={locale}
        plan={plan}
        foods={foods}
      />
    </div>
  );
}
