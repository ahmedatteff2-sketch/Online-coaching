import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Phone, Mail } from "lucide-react";
import { getApplication } from "@/lib/applications/queries";
import { getPackage } from "@/lib/packages/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readLocaleFromCookie } from "@/lib/i18n/locale-cookie";
import { formatDate } from "@/lib/utils";
import { ApplicationStatusControl } from "@/components/admin/applications/application-status-control";
import { ApplicationNotesEditor } from "@/components/admin/applications/application-notes-editor";
import {
  buildWhatsappLink,
  paymentInstructionsMessage,
} from "@/lib/whatsapp/templates";
import type { ApplicationStatus } from "@/types/database";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<ApplicationStatus, { en: string; ar: string }> = {
  new: { en: "New", ar: "جديدة" },
  contacted: { en: "Contacted", ar: "تم التواصل" },
  in_review: { en: "In review", ar: "تحت المراجعة" },
  accepted: { en: "Accepted", ar: "مقبولة" },
  rejected: { en: "Rejected", ar: "مرفوضة" },
  archived: { en: "Archived", ar: "مؤرشفة" },
};

const GOAL_LABEL: Record<string, { en: string; ar: string }> = {
  fat_loss: { en: "Fat loss", ar: "خسارة دهون" },
  muscle_gain: { en: "Muscle gain", ar: "زيادة عضلية" },
  recomposition: { en: "Recomposition", ar: "تنحيف وتضخيم" },
  athletic_performance: { en: "Athletic performance", ar: "أداء رياضي" },
};

const ACTIVITY_LABEL: Record<string, { en: string; ar: string }> = {
  sedentary: { en: "Sedentary", ar: "قليل" },
  light: { en: "Light", ar: "خفيف" },
  moderate: { en: "Moderate", ar: "متوسط" },
  active: { en: "Active", ar: "نشيط" },
  very_active: { en: "Very active", ar: "نشاط عالي" },
};

const EXPERIENCE_LABEL: Record<string, { en: string; ar: string }> = {
  beginner: { en: "Beginner", ar: "مبتدئ" },
  intermediate: { en: "Intermediate", ar: "متوسط" },
  advanced: { en: "Advanced", ar: "متقدم" },
};

interface Props {
  params: Promise<{ applicationId: string }>;
}

export default async function AdminApplicationDetailPage(props: Props) {
  const params = await props.params;
  const locale = readLocaleFromCookie();
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const application = await getApplication(params.applicationId);
  if (!application) notFound();

  const pkg = application.package_id
    ? await getPackage(application.package_id)
    : null;

  // Use the shared helper so phone normalisation + URL-encoding stay
  // consistent with the rest of the WhatsApp deep-link surface.
  const whatsappHref = buildWhatsappLink(application.phone, "");
  const phoneHref = `tel:${application.phone}`;
  const emailHref = `mailto:${application.email}`;

  // Pre-built "send Vodafone Cash instructions" WhatsApp deep link.
  const instructionsMsg = paymentInstructionsMessage({
    clientName: application.full_name,
    amount: pkg?.price ?? 0,
    currency: pkg?.currency ?? "EGP",
    packageName: pkg ? (locale === "ar" ? pkg.name_ar : pkg.name_en) : null,
    locale,
  });
  const whatsappPaymentHref = buildWhatsappLink(
    application.phone,
    instructionsMsg,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/applications"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            {t("Back to applications", "ارجع للطلبات")}
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">
            {application.full_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("Submitted", "اتقدم")}{" "}
            {formatDate(application.created_at, locale)}
            {application.contacted_at && (
              <>
                {" · "}
                {t("Contacted", "تم التواصل")}{" "}
                {formatDate(application.contacted_at, locale)}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <MessageSquare className="h-4 w-4" />
            {t("WhatsApp", "واتساب")}
          </a>
          <a
            href={phoneHref}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-card/70"
          >
            <Phone className="h-4 w-4" />
            {t("Call", "اتصال")}
          </a>
          <a
            href={emailHref}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-card/70"
          >
            <Mail className="h-4 w-4" />
            {t("Email", "إيميل")}
          </a>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("Contact details", "بيانات التواصل")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <DataRow label={t("Email", "إيميل")} value={application.email} />
              <DataRow label={t("Phone", "موبايل")} value={application.phone} />
              <DataRow
                label={t("Country", "الدولة")}
                value={application.country}
              />
              <DataRow label={t("City", "المدينة")} value={application.city} />
              <DataRow
                label={t("Preferred contact", "وسيلة التواصل")}
                value={application.preferred_contact}
              />
              <DataRow
                label={t("Best time", "أنسب وقت")}
                value={application.best_contact_time}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("Goals & profile", "الأهداف والمعلومات")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <DataRow label={t("Age", "العمر")} value={application.age} />
              <DataRow
                label={t("Gender", "النوع")}
                value={application.gender}
              />
              <DataRow
                label={t("Height (cm)", "الطول")}
                value={application.height_cm}
              />
              <DataRow
                label={t("Weight (kg)", "الوزن")}
                value={application.weight_kg}
              />
              <DataRow
                label={t("Body fat %", "نسبة الدهون %")}
                value={application.body_fat_percent}
              />
              <DataRow
                label={t("Goal", "الهدف")}
                value={
                  application.goal
                    ? (GOAL_LABEL[application.goal]?.[locale] ??
                      application.goal)
                    : null
                }
              />
              <DataRow
                label={t("Target weight (kg)", "الوزن المستهدف")}
                value={application.target_weight_kg}
              />
              <DataRow
                label={t("Target date", "التاريخ المستهدف")}
                value={
                  application.target_date
                    ? formatDate(application.target_date, locale)
                    : null
                }
              />
              <DataRow
                label={t("Experience", "الخبرة")}
                value={
                  application.experience_level
                    ? EXPERIENCE_LABEL[application.experience_level]?.[locale]
                    : null
                }
              />
              <DataRow
                label={t("Previous coaching?", "كوتشينج قبل كده؟")}
                value={
                  application.previous_coaching
                    ? t("Yes", "أيوه")
                    : t("No", "لأ")
                }
              />
              <LongRow
                label={t("Motivation", "الدافع")}
                value={application.motivation_text}
              />
              <LongRow
                label={t("Previous results", "نتايج سابقة")}
                value={application.previous_results_text}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("Training", "التدريب")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <DataRow
                label={t("Days/week", "أيام/أسبوع")}
                value={application.training_days_per_week}
              />
              <DataRow
                label={t("Location", "المكان")}
                value={application.training_location}
              />
              <DataRow
                label={t("Preferred time", "الوقت المفضل")}
                value={application.preferred_training_time}
              />
              <LongRow
                label={t("Equipment", "الأجهزة")}
                value={application.available_equipment_text}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("Health", "الصحة")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <LongRow
                label={t("Injuries / conditions", "إصابات / حالات")}
                value={application.injuries_or_conditions}
              />
              <DataRow
                label={t("Medications", "أدوية")}
                value={application.medications}
              />
              <DataRow
                label={t("Allergies", "حساسية")}
                value={application.allergies}
              />
              <LongRow
                label={t("Surgeries", "عمليات سابقة")}
                value={application.surgeries_text}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("Nutrition", "التغذية")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <DataRow
                label={t("Dietary restrictions", "قيود غذائية")}
                value={application.dietary_restrictions}
              />
              <DataRow
                label={t("Foods disliked", "أكلات مش بتحبها")}
                value={application.foods_disliked}
              />
              <LongRow
                label={t("Typical day of eating", "يوم أكل عادي")}
                value={application.current_diet_summary}
              />
              <DataRow
                label={t("Water (L/day)", "ميه (لتر/يوم)")}
                value={application.water_intake_liters}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("Lifestyle", "نمط الحياة")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <DataRow
                label={t("Occupation", "الشغل")}
                value={application.occupation}
              />
              <DataRow
                label={t("Activity level", "النشاط")}
                value={
                  application.daily_activity_level
                    ? ACTIVITY_LABEL[application.daily_activity_level]?.[locale]
                    : null
                }
              />
              <DataRow
                label={t("Sleep (hours)", "النوم (ساعات)")}
                value={application.sleep_hours_avg}
              />
              <DataRow
                label={t("Stress (1-5)", "التوتر (١-٥)")}
                value={application.stress_level}
              />
              <DataRow
                label={t("Smokes?", "بيدخن؟")}
                value={application.smokes ? t("Yes", "أيوه") : t("No", "لأ")}
              />
              <LongRow
                label={t("Notes from applicant", "ملاحظات من المتقدم")}
                value={application.notes}
              />
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("Status", "الحالة")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ApplicationStatusControl
                applicationId={application.id}
                currentStatus={application.status}
                locale={locale}
              />
              <p className="text-xs text-muted-foreground">
                {t("Current:", "الحالة الحالية:")}{" "}
                <span className="font-medium text-foreground">
                  {STATUS_LABEL[application.status][locale]}
                </span>
              </p>
            </CardContent>
          </Card>

          {pkg && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("Selected package", "الباقة المختارة")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-semibold">
                  {locale === "ar" ? pkg.name_ar : pkg.name_en}
                </p>
                <p className="text-muted-foreground">
                  {pkg.price > 0
                    ? `${pkg.price} ${pkg.currency}`
                    : t("Custom", "مخصصة")}
                </p>
                <Link
                  href={`/admin/packages/${pkg.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  {t("View package →", "اعرض الباقة ←")}
                </Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("Payment", "الدفع")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <a
                href={whatsappPaymentHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <MessageSquare className="h-4 w-4" />
                {t(
                  "Send Vodafone Cash instructions",
                  "ابعت تعليمات فودافون كاش",
                )}
              </a>
              <Link
                href={`/admin/payments/new?application_id=${application.id}${pkg ? `&package_id=${pkg.id}` : ""}`}
                className="block w-full rounded-md border border-border px-3 py-2 text-center text-sm font-medium hover:bg-card/70"
              >
                {t("Record payment", "تسجيل دفعة")}
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("Admin notes", "ملاحظات الأدمن")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ApplicationNotesEditor
                applicationId={application.id}
                initialNotes={application.admin_notes ?? ""}
                locale={locale}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("Convert to client", "تحويل إلى عميل")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                {t(
                  "Once you've talked and agreed, provision a client account.",
                  "لما تتفق معاه، اعمله حساب عميل من اللوحة.",
                )}
              </p>
              <Link
                href={`/admin/clients/new?email=${encodeURIComponent(application.email)}&full_name=${encodeURIComponent(application.full_name)}&age=${application.age ?? ""}&height_cm=${application.height_cm ?? ""}&starting_weight_kg=${application.weight_kg ?? ""}&experience_level=${application.experience_level ?? ""}&goal=${application.goal ?? ""}`}
                className="block w-full rounded-md bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {t("Create client account", "أنشئ حساب عميل")}
              </Link>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function DataRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-medium">
        {value === null || value === undefined || value === "" ? "—" : value}
      </p>
    </div>
  );
}

function LongRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="sm:col-span-2">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="whitespace-pre-wrap text-sm">{value || "—"}</p>
    </div>
  );
}
