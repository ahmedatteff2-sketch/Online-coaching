import Link from "next/link";
import { Plus } from "lucide-react";
import { listPayments, getPaymentStats } from "@/lib/payments/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readLocaleFromCookie } from "@/lib/i18n/locale-cookie";
import { formatDate } from "@/lib/utils";
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_COLOR,
  PAYMENT_STATUS_LABEL,
  formatMoney,
} from "@/lib/payments/format";
import type { PaymentStatus } from "@/types/database";

export const dynamic = "force-dynamic";

const FILTERS: ("all" | PaymentStatus)[] = [
  "all",
  "pending",
  "confirmed",
  "rejected",
  "refunded",
];

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminPaymentsPage(props: Props) {
  const searchParams = await props.searchParams;
  const locale = readLocaleFromCookie();
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const filter = (searchParams.status ?? "all") as "all" | PaymentStatus;

  const [payments, stats] = await Promise.all([
    listPayments({ status: filter }),
    getPaymentStats(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {t("Payments", "الدفعات")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "Track payments clients sent you via Vodafone Cash or other methods.",
              "تابع الدفعات اللي جاتلك من العملاء على فودافون كاش أو أي وسيلة.",
            )}
          </p>
        </div>
        <Link
          href="/admin/payments/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {t("Record payment", "تسجيل دفعة")}
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("Pending", "في الانتظار")}
          value={String(stats.pending)}
          href="/admin/payments?status=pending"
        />
        <StatCard
          label={t("Confirmed this month", "مؤكدة الشهر ده")}
          value={String(stats.confirmedThisMonth)}
        />
        <StatCard
          label={t("Revenue this month", "إيرادات الشهر")}
          value={formatMoney(stats.revenueThisMonth, "EGP")}
        />
        <StatCard
          label={t("Lifetime revenue", "الإيرادات الكلية")}
          value={formatMoney(stats.revenueLifetime, "EGP")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((s) => {
          const isActive = filter === s;
          const label =
            s === "all"
              ? t("All", "الكل")
              : PAYMENT_STATUS_LABEL[s as PaymentStatus][locale];
          return (
            <Link
              key={s}
              href={`/admin/payments?status=${s}`}
              className={
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs " +
                (isActive
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground")
              }
            >
              {label}
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("Results", "النتائج")}
            <span className="ms-2 text-sm font-normal text-muted-foreground">
              ({payments.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t(
                "No payments match this filter yet.",
                "مفيش دفعات في الفلتر ده.",
              )}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-start text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pe-3 text-start">
                      {t("Client / Lead", "العميل / الطلب")}
                    </th>
                    <th className="py-2 pe-3 text-start">
                      {t("Package", "الباقة")}
                    </th>
                    <th className="py-2 pe-3 text-start">
                      {t("Amount", "المبلغ")}
                    </th>
                    <th className="py-2 pe-3 text-start">
                      {t("Method", "الوسيلة")}
                    </th>
                    <th className="py-2 pe-3 text-start">
                      {t("Covers", "الفترة")}
                    </th>
                    <th className="py-2 pe-3 text-start">
                      {t("Status", "الحالة")}
                    </th>
                    <th className="py-2 pe-3 text-start">
                      {t("Created", "التاريخ")}
                    </th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const subjectName =
                      p.client_name ?? p.application_name ?? "—";
                    const subjectEmail =
                      p.client_email ?? p.application_email ?? "";
                    const pkgName = p.client_id
                      ? null
                      : p.package_name_en
                        ? locale === "ar"
                          ? p.package_name_ar
                          : p.package_name_en
                        : null;
                    const pkgInline =
                      p.package_name_en && p.client_id
                        ? locale === "ar"
                          ? p.package_name_ar
                          : p.package_name_en
                        : pkgName;
                    const covers =
                      p.period_start && p.period_end
                        ? `${formatDate(p.period_start, locale)} → ${formatDate(
                            p.period_end,
                            locale,
                          )}`
                        : "—";
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-border/30 last:border-0"
                      >
                        <td className="py-3 pe-3 font-medium">
                          {subjectName}
                          {subjectEmail && (
                            <div className="text-xs font-normal text-muted-foreground">
                              {subjectEmail}
                            </div>
                          )}
                        </td>
                        <td className="py-3 pe-3 text-muted-foreground">
                          {pkgInline ?? "—"}
                        </td>
                        <td className="py-3 pe-3">
                          {formatMoney(p.amount, p.currency)}
                        </td>
                        <td className="py-3 pe-3">
                          {PAYMENT_METHOD_LABEL[p.method][locale]}
                        </td>
                        <td className="py-3 pe-3 text-xs text-muted-foreground">
                          {covers}
                        </td>
                        <td className="py-3 pe-3">
                          <span
                            className={
                              "rounded-full px-2 py-0.5 text-xs " +
                              PAYMENT_STATUS_COLOR[p.status]
                            }
                          >
                            {PAYMENT_STATUS_LABEL[p.status][locale]}
                          </span>
                        </td>
                        <td className="py-3 pe-3 text-xs text-muted-foreground">
                          {formatDate(p.created_at, locale)}
                        </td>
                        <td className="py-3 ps-3 text-end">
                          <Link
                            href={`/admin/payments/${p.id}`}
                            className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-card/70"
                          >
                            {t("Open", "فتح")}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <Card>
      <CardHeader>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <CardTitle className="font-display text-2xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
