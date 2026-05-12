import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getClientDetail } from "@/lib/clients/queries";
import {
  getComplianceSummary,
  getProgressPhotoSignedUrls,
  listBodyMeasurements,
  listCheckins,
  listProgressPhotos,
  listWeightLogs,
} from "@/lib/tracking/queries";
import { readLocaleFromCookie } from "@/lib/i18n/locale-cookie";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClientWeightChart } from "@/components/admin/monitor/client-weight-chart";

export const dynamic = "force-dynamic";

export default async function ClientMonitorPage(
  props: {
    params: Promise<{ clientId: string }>;
  }
) {
  const params = await props.params;
  const detail = await getClientDetail(params.clientId);
  if (!detail) notFound();
  const locale = readLocaleFromCookie();

  const [weights, measurements, photos, checkins, summary] = await Promise.all([
    listWeightLogs(params.clientId, 60),
    listBodyMeasurements(params.clientId, 12),
    listProgressPhotos(params.clientId, 12),
    listCheckins(params.clientId, 14),
    getComplianceSummary(params.clientId, 7),
  ]);
  const signedUrls = await getProgressPhotoSignedUrls(
    photos.map((p) => p.storage_path),
  );

  const latestMeasurement = measurements[0];

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
          {locale === "ar" ? "متابعة التقدم" : "Progress monitor"}
        </h1>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ComplianceCard
          label={locale === "ar" ? "تمرين (٧ أيام)" : "Workout · 7d"}
          value={`${summary.workout_pct}%`}
        />
        <ComplianceCard
          label={locale === "ar" ? "تغذية (٧ أيام)" : "Diet · 7d"}
          value={`${summary.diet_pct}%`}
        />
        <ComplianceCard
          label={locale === "ar" ? "كارديو (٧ أيام)" : "Cardio · 7d"}
          value={`${summary.cardio_pct}%`}
        />
        <ComplianceCard
          label={locale === "ar" ? "نوم (متوسط)" : "Sleep avg"}
          value={summary.sleep_avg !== null ? `${summary.sleep_avg}/5` : "—"}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {locale === "ar" ? "الوزن خلال الفترة" : "Weight trend"}
          </CardTitle>
          <CardDescription>
            {weights.length === 0
              ? locale === "ar"
                ? "لسه ما اتسجل وزن."
                : "No weight logged yet."
              : `${weights.length} ${locale === "ar" ? "تسجيل" : "entries"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientWeightChart weights={weights} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {locale === "ar" ? "آخر القياسات" : "Latest measurements"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {latestMeasurement ? (
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:grid-cols-5">
              <Stat label="kg" value={latestMeasurement.weight_kg} />
              <Stat
                label={locale === "ar" ? "خصر" : "Waist"}
                value={latestMeasurement.waist_cm}
              />
              <Stat
                label={locale === "ar" ? "صدر" : "Chest"}
                value={latestMeasurement.chest_cm}
              />
              <Stat
                label={locale === "ar" ? "أكتاف" : "Shoulders"}
                value={latestMeasurement.shoulders_cm}
              />
              <Stat
                label={locale === "ar" ? "خصر" : "Hips"}
                value={latestMeasurement.hips_cm}
              />
              <Stat
                label={locale === "ar" ? "ذراع شمال" : "L. arm"}
                value={latestMeasurement.left_arm_cm}
              />
              <Stat
                label={locale === "ar" ? "ذراع يمين" : "R. arm"}
                value={latestMeasurement.right_arm_cm}
              />
              <Stat
                label={locale === "ar" ? "فخذ شمال" : "L. thigh"}
                value={latestMeasurement.left_thigh_cm}
              />
              <Stat
                label={locale === "ar" ? "فخذ يمين" : "R. thigh"}
                value={latestMeasurement.right_thigh_cm}
              />
              <Stat label="BF%" value={latestMeasurement.body_fat_percent} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {locale === "ar" ? "لسه مفيش قياسات." : "No measurements yet."}
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {locale === "ar" ? "صور التقدم" : "Progress photos"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {locale === "ar" ? "مفيش صور لسه." : "No photos yet."}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {photos.map((p) => {
                const url = signedUrls.get(p.storage_path);
                return (
                  <div
                    key={p.id}
                    className="overflow-hidden rounded-md border border-border/60"
                  >
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      (<img
                        src={url}
                        alt={p.note ?? p.taken_on}
                        className="h-32 w-full object-cover"
                      />)
                    ) : (
                      <div className="flex h-32 w-full items-center justify-center bg-card text-xs text-muted-foreground">
                        —
                      </div>
                    )}
                    <p className="bg-card/80 px-1 py-0.5 text-center text-[10px]">
                      {p.taken_on}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {locale === "ar" ? "آخر تشيك إن" : "Latest check-ins"}
          </CardTitle>
          <CardDescription>
            {summary.checkins_filled}/{summary.checkins_total}{" "}
            {locale === "ar" ? "أيام مكتملة" : "days completed"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {checkins.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {locale === "ar" ? "لسه مفيش تشيك إن." : "No check-ins yet."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground">
                    <th className="py-2 pe-2 text-start">
                      {locale === "ar" ? "التاريخ" : "Date"}
                    </th>
                    <th className="py-2 pe-2 text-start">
                      {locale === "ar" ? "تمرين" : "Workout"}
                    </th>
                    <th className="py-2 pe-2 text-end">
                      {locale === "ar" ? "تغذية" : "Diet"}
                    </th>
                    <th className="py-2 pe-2 text-end">
                      {locale === "ar" ? "كارديو" : "Cardio"}
                    </th>
                    <th className="py-2 pe-2 text-end">
                      {locale === "ar" ? "نوم" : "Sleep"}
                    </th>
                    <th className="py-2 pe-2 text-start">
                      {locale === "ar" ? "ملاحظة" : "Note"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {checkins.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-border/30 align-top last:border-0"
                    >
                      <td className="py-2 pe-2">{c.checkin_date}</td>
                      <td className="py-2 pe-2 capitalize">{c.workout_done}</td>
                      <td className="py-2 pe-2 text-end tabular-nums">
                        {c.diet_compliance ?? "—"}%
                      </td>
                      <td className="py-2 pe-2 text-end tabular-nums">
                        {c.cardio_done ? `${c.cardio_minutes ?? "?"}m` : "—"}
                      </td>
                      <td className="py-2 pe-2 text-end tabular-nums">
                        {c.sleep_quality ? `${c.sleep_quality}/5` : "—"}
                      </td>
                      <td className="py-2 pe-2 text-muted-foreground">
                        {c.client_note ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ComplianceCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="font-display text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-md border border-border/60 bg-card/60 px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-semibold tabular-nums">{value ?? "—"}</p>
    </div>
  );
}
