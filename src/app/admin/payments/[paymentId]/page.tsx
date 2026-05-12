import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { getPayment } from "@/lib/payments/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readLocaleFromCookie } from "@/lib/i18n/locale-cookie";
import { formatDate } from "@/lib/utils";
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_COLOR,
  PAYMENT_STATUS_LABEL,
  formatMoney,
} from "@/lib/payments/format";
import {
  buildWhatsappLink,
  paymentInstructionsMessage,
} from "@/lib/whatsapp/templates";
import { PaymentActions } from "@/components/admin/payments/payment-actions";
import { createClient } from "@/lib/supabase/server";
import type { CoachingApplication } from "@/types/database";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ paymentId: string }>;
}

export default async function PaymentDetailPage(props: Props) {
  const params = await props.params;
  const locale = readLocaleFromCookie();
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const payment = await getPayment(params.paymentId);
  if (!payment) notFound();

  // We need the phone of whichever subject this payment is attached to,
  // so we can pre-fill a WhatsApp deep link for the coach.
  const { phone, displayName } = await resolveContact(payment);

  const packageName =
    payment.package_name_en &&
    (locale === "ar" ? payment.package_name_ar : payment.package_name_en);

  const instructionsMsg = paymentInstructionsMessage({
    clientName: displayName ?? "",
    amount: payment.amount,
    currency: payment.currency,
    packageName: packageName ?? null,
    locale,
  });
  const whatsappInstructionsLink = phone
    ? buildWhatsappLink(phone, instructionsMsg)
    : null;

  const subjectHref = payment.client_id
    ? `/admin/clients/${payment.client_id}`
    : payment.application_id
      ? `/admin/applications/${payment.application_id}`
      : null;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/payments"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("All payments", "كل الدفعات")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {formatMoney(payment.amount, payment.currency)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {PAYMENT_METHOD_LABEL[payment.method][locale]}
            {" · "}
            {formatDate(payment.created_at, locale)}
          </p>
        </div>
        <span
          className={
            "rounded-full px-3 py-1 text-sm font-medium " +
            PAYMENT_STATUS_COLOR[payment.status]
          }
        >
          {PAYMENT_STATUS_LABEL[payment.status][locale]}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("Subject", "الوجهة")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-semibold">{displayName ?? "—"}</p>
              {payment.client_email || payment.application_email ? (
                <p className="text-muted-foreground">
                  {payment.client_email ?? payment.application_email}
                </p>
              ) : null}
              {phone ? (
                <p className="text-muted-foreground">{phone}</p>
              ) : null}
              {subjectHref ? (
                <Link
                  href={subjectHref}
                  className="text-xs text-primary hover:underline"
                >
                  {payment.client_id
                    ? t("Open client profile →", "افتح ملف العميل ←")
                    : t("Open application →", "افتح الطلب ←")}
                </Link>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("Payment details", "تفاصيل الدفعة")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <DataRow
                label={t("Reference", "المرجع")}
                value={payment.reference_number}
              />
              <DataRow
                label={t("Sender phone", "رقم المُرسِل")}
                value={payment.sender_phone}
              />
              <DataRow
                label={t("Paid at", "تاريخ الدفع")}
                value={
                  payment.paid_at
                    ? formatDate(payment.paid_at, locale)
                    : null
                }
              />
              <DataRow
                label={t("Confirmed at", "تاريخ التأكيد")}
                value={
                  payment.confirmed_at
                    ? formatDate(payment.confirmed_at, locale)
                    : null
                }
              />
              <DataRow
                label={t("Package", "الباقة")}
                value={packageName ?? null}
              />
              <DataRow
                label={t("Duration", "المدة")}
                value={
                  payment.duration_days
                    ? `${payment.duration_days} ${t("days", "يوم")}`
                    : null
                }
              />
              <DataRow
                label={t("Covers from", "يغطي من")}
                value={
                  payment.period_start
                    ? formatDate(payment.period_start, locale)
                    : null
                }
              />
              <DataRow
                label={t("Covers until", "يغطي حتى")}
                value={
                  payment.period_end
                    ? formatDate(payment.period_end, locale)
                    : null
                }
              />
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  {t("Notes", "ملاحظات")}
                </p>
                <p className="whitespace-pre-wrap text-sm">
                  {payment.notes || "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("Actions", "الإجراءات")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PaymentActions
                paymentId={payment.id}
                currentStatus={payment.status}
                locale={locale}
              />
            </CardContent>
          </Card>

          {whatsappInstructionsLink && payment.status === "pending" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("WhatsApp the client", "كلّم العميل على واتساب")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-xs text-muted-foreground">
                  {t(
                    "Send payment instructions with your Vodafone Cash number.",
                    "ابعت تعليمات الدفع مع رقم فودافون كاش.",
                  )}
                </p>
                <a
                  href={whatsappInstructionsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <MessageSquare className="h-4 w-4" />
                  {t("Send on WhatsApp", "ابعت على واتساب")}
                </a>
              </CardContent>
            </Card>
          )}
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

/**
 * Resolve the phone + display name of whichever subject this payment is
 * attached to. Clients don't have phones on their own row yet (phone
 * lives on the application row that birthed them, or on the 0007-added
 * `clients.phone` column) so we try both sources.
 */
async function resolveContact(payment: {
  client_id: string | null;
  application_id: string | null;
  client_name: string | null;
  application_name: string | null;
}): Promise<{ phone: string | null; displayName: string | null }> {
  const supabase = createClient();
  if (payment.client_id) {
    const { data } = (await supabase
      .from("clients")
      .select("whatsapp_phone, phone")
      .eq("id", payment.client_id)
      .maybeSingle()) as {
      data: { whatsapp_phone: string | null; phone: string | null } | null;
    };
    return {
      phone: data?.whatsapp_phone ?? data?.phone ?? null,
      displayName: payment.client_name,
    };
  }
  if (payment.application_id) {
    const { data } = (await supabase
      .from("coaching_applications")
      .select("phone, full_name")
      .eq("id", payment.application_id)
      .maybeSingle()) as {
      data: Pick<CoachingApplication, "phone" | "full_name"> | null;
    };
    return {
      phone: data?.phone ?? null,
      displayName: payment.application_name ?? data?.full_name ?? null,
    };
  }
  return { phone: null, displayName: null };
}
