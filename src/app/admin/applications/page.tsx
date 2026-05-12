import Link from "next/link";
import {
  listApplications,
  countApplicationsByStatus,
} from "@/lib/applications/queries";
import { listAllPackages } from "@/lib/packages/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { readLocaleFromCookie } from "@/lib/i18n/locale-cookie";
import { formatDate } from "@/lib/utils";
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

const STATUS_COLOR: Record<ApplicationStatus, string> = {
  new: "bg-primary/15 text-primary",
  contacted: "bg-blue-500/15 text-blue-400",
  in_review: "bg-yellow-500/15 text-yellow-400",
  accepted: "bg-green-500/15 text-green-400",
  rejected: "bg-destructive/15 text-destructive",
  archived: "bg-muted text-muted-foreground",
};

const FILTERS: ("all" | ApplicationStatus)[] = [
  "all",
  "new",
  "contacted",
  "in_review",
  "accepted",
  "rejected",
  "archived",
];

interface Props {
  searchParams: Promise<{ status?: string; package_id?: string }>;
}

export default async function AdminApplicationsPage(props: Props) {
  const searchParams = await props.searchParams;
  const locale = readLocaleFromCookie();
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const filter = (searchParams.status ?? "new") as "all" | ApplicationStatus;
  const packageFilter = searchParams.package_id ?? null;

  const [applications, counts, packages] = await Promise.all([
    listApplications({
      status: filter === "all" ? "all" : (filter as ApplicationStatus),
      packageId: packageFilter,
    }),
    countApplicationsByStatus(),
    listAllPackages(),
  ]);

  const newCount = counts.new ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            {t("Applications", "طلبات الاشتراك")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "Leads from the public application form.",
              "الطلبات اللي بتيجي من فورم الموقع.",
            )}
          </p>
        </div>
        {newCount > 0 && (
          <Link
            href="/admin/applications?status=new"
            className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary"
          >
            {t(`${newCount} new`, `${newCount} جديدة`)}
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((s) => {
          const isActive = filter === s;
          const count =
            s === "all" ? undefined : counts[s as ApplicationStatus];
          const label =
            s === "all"
              ? t("All", "الكل")
              : STATUS_LABEL[s as ApplicationStatus][locale];
          return (
            <Link
              key={s}
              href={`/admin/applications?status=${s}`}
              className={
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs " +
                (isActive
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground")
              }
            >
              {label}
              {typeof count === "number" && (
                <span className="rounded-full bg-background/60 px-1.5 py-0.5 text-[10px]">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t("Results", "النتائج")}
            <span className="ms-2 text-sm font-normal text-muted-foreground">
              ({applications.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t(
                "No applications match this filter.",
                "مفيش طلبات في الفلتر ده.",
              )}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-start text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pe-3 text-start">
                      {t("Name", "الاسم")}
                    </th>
                    <th className="py-2 pe-3 text-start">
                      {t("Contact", "التواصل")}
                    </th>
                    <th className="py-2 pe-3 text-start">
                      {t("Goal", "الهدف")}
                    </th>
                    <th className="py-2 pe-3 text-start">
                      {t("Package", "الباقة")}
                    </th>
                    <th className="py-2 pe-3 text-start">
                      {t("Status", "الحالة")}
                    </th>
                    <th className="py-2 pe-3 text-start">
                      {t("Submitted", "تاريخ التقديم")}
                    </th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((a) => {
                    const pkg = a.package_id
                      ? packages.find((p) => p.id === a.package_id)
                      : null;
                    return (
                      <tr
                        key={a.id}
                        className="border-b border-border/30 last:border-0"
                      >
                        <td className="py-3 pe-3 font-medium">{a.full_name}</td>
                        <td className="py-3 pe-3 text-muted-foreground">
                          <div>{a.email}</div>
                          <div className="text-xs">{a.phone}</div>
                        </td>
                        <td className="py-3 pe-3 text-muted-foreground">
                          {a.goal ?? "—"}
                        </td>
                        <td className="py-3 pe-3 text-muted-foreground">
                          {pkg
                            ? locale === "ar"
                              ? pkg.name_ar
                              : pkg.name_en
                            : "—"}
                        </td>
                        <td className="py-3 pe-3">
                          <span
                            className={
                              "rounded-full px-2 py-0.5 text-xs " +
                              STATUS_COLOR[a.status]
                            }
                          >
                            {STATUS_LABEL[a.status][locale]}
                          </span>
                        </td>
                        <td className="py-3 pe-3 text-xs text-muted-foreground">
                          {formatDate(a.created_at, locale)}
                        </td>
                        <td className="py-3 ps-3 text-end">
                          <Link
                            href={`/admin/applications/${a.id}`}
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
