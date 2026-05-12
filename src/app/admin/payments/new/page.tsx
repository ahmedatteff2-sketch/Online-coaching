import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { readLocaleFromCookie } from "@/lib/i18n/locale-cookie";
import { listClients } from "@/lib/clients/queries";
import { listApplications } from "@/lib/applications/queries";
import { listAllPackages } from "@/lib/packages/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewPaymentForm } from "@/components/admin/payments/new-payment-form";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ client_id?: string; application_id?: string }>;
}

export default async function NewPaymentPage(props: Props) {
  const searchParams = await props.searchParams;
  const locale = readLocaleFromCookie();
  const [clients, applications, packages] = await Promise.all([
    listClients(),
    listApplications({ status: "all" }),
    listAllPackages(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/admin/payments"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {locale === "ar" ? "كل الدفعات" : "All payments"}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">
            {locale === "ar" ? "تسجيل دفعة جديدة" : "Record a new payment"}
          </CardTitle>
          <CardDescription>
            {locale === "ar"
              ? "دخّل تفاصيل الدفعة اللي استلمتها على فودافون كاش أو أي وسيلة تانية."
              : "Log a payment you received via Vodafone Cash or any other method."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NewPaymentForm
            locale={locale}
            clients={clients.map((c) => ({
              id: c.id,
              label:
                (c.full_name ?? c.email) + (c.email ? ` (${c.email})` : ""),
            }))}
            applications={applications.map((a) => ({
              id: a.id,
              label: `${a.full_name} (${a.email})`,
            }))}
            packages={packages
              .filter((p) => p.is_active)
              .map((p) => ({
                id: p.id,
                label:
                  (locale === "ar" ? p.name_ar : p.name_en) +
                  ` — ${p.price} ${p.currency}`,
                price: p.price,
                currency: p.currency,
                billing_period: p.billing_period,
              }))}
            initialClientId={searchParams.client_id ?? ""}
            initialApplicationId={searchParams.application_id ?? ""}
          />
        </CardContent>
      </Card>
    </div>
  );
}
