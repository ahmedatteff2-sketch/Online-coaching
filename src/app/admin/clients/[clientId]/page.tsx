import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Apple,
  ArrowLeft,
  Dumbbell,
  LineChart,
  MessageCircle,
} from "lucide-react";
import { getClientDetail } from "@/lib/clients/queries";
import { readLocaleFromCookie } from "@/lib/i18n/locale-cookie";
import { ClientProfileForm } from "@/components/admin/clients/client-profile-form";
import { ResetPasswordCard } from "@/components/admin/clients/reset-password-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage(
  props: {
    params: Promise<{ clientId: string }>;
  }
) {
  const params = await props.params;
  const detail = await getClientDetail(params.clientId);
  if (!detail) notFound();
  const locale = readLocaleFromCookie();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/clients"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {locale === "ar" ? "كل العملاء" : "All clients"}
      </Link>

      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {detail.profile.full_name ?? detail.profile.email}
        </h1>
        <p className="text-muted-foreground">{detail.profile.email}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">
              {locale === "ar" ? "الوصول السريع" : "Quick links"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href={`/admin/clients/${detail.client.id}/workout`}
              className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-card/80"
            >
              <Dumbbell className="h-4 w-4 text-primary" />
              {locale === "ar" ? "خطة التمرين" : "Workout plan"}
            </Link>
            <Link
              href={`/admin/clients/${detail.client.id}/nutrition`}
              className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-card/80"
            >
              <Apple className="h-4 w-4 text-primary" />
              {locale === "ar" ? "خطة التغذية" : "Nutrition plan"}
            </Link>
            <Link
              href={`/admin/clients/${detail.client.id}/monitor`}
              className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-card/80"
            >
              <LineChart className="h-4 w-4 text-primary" />
              {locale === "ar" ? "متابعة التقدم" : "Progress monitor"}
            </Link>
            <Link
              href={`/admin/clients/${detail.client.id}/messages`}
              className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-card/80"
            >
              <MessageCircle className="h-4 w-4 text-primary" />
              {locale === "ar" ? "إرسال رسالة" : "Send a message"}
            </Link>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <ResetPasswordCard
            locale={locale}
            clientId={detail.client.id}
            email={detail.profile.email}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {locale === "ar" ? "بيانات العميل" : "Client profile"}
              </CardTitle>
              <CardDescription>
                {locale === "ar"
                  ? "تعديل البيانات الشخصية والأهداف."
                  : "Edit personal info, training goals, and health notes."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClientProfileForm
                locale={locale}
                clientId={detail.client.id}
                initial={{
                  full_name: detail.profile.full_name ?? "",
                  age: detail.client.age,
                  height_cm: detail.client.height_cm,
                  starting_weight_kg: detail.client.starting_weight_kg,
                  experience_level: detail.client.experience_level,
                  goal: detail.client.goal,
                  health_notes: detail.client.health_notes,
                  start_date: detail.client.start_date,
                  target_date: detail.client.target_date,
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
