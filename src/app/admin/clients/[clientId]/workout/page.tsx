import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getClientDetail } from "@/lib/clients/queries";
import { getActivePlan } from "@/lib/workouts/queries";
import { listExerciseLibrary } from "@/lib/exercise-library/queries";
import { readLocaleFromCookie } from "@/lib/i18n/locale-cookie";
import { PlanBuilder } from "@/components/admin/workouts/plan-builder";

export const dynamic = "force-dynamic";

export default async function ClientWorkoutPage({
  params,
}: {
  params: { clientId: string };
}) {
  const detail = await getClientDetail(params.clientId);
  if (!detail) notFound();
  const locale = readLocaleFromCookie();
  const [planWithDays, library] = await Promise.all([
    getActivePlan(params.clientId),
    listExerciseLibrary(),
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
          {locale === "ar" ? "خطة التمرين" : "Workout plan"}
        </h1>
      </div>

      <PlanBuilder
        clientId={params.clientId}
        locale={locale}
        plan={planWithDays}
        library={library}
      />
    </div>
  );
}
