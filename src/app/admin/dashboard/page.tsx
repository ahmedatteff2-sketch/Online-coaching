import Link from "next/link";
import { ArrowRight, FileText, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = createClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sinceDate = sevenDaysAgo.toISOString().slice(0, 10);

  const [
    { count: clientCount },
    { count: foodCount },
    { count: setsLogged },
    { count: checkinCount },
  ] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("food_database").select("id", { count: "exact", head: true }),
    supabase
      .from("workout_logs")
      .select("id", { count: "exact", head: true })
      .gte("log_date", sinceDate),
    supabase
      .from("daily_checkins")
      .select("id", { count: "exact", head: true })
      .gte("checkin_date", sinceDate),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          High-level overview of your coaching practice.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Active clients</CardDescription>
            <CardTitle className="font-display text-3xl">
              {clientCount ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Foods in DB</CardDescription>
            <CardTitle className="font-display text-3xl">
              {foodCount ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Sets logged · last 7 days</CardDescription>
            <CardTitle className="font-display text-3xl">
              {setsLogged ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Check-ins · last 7 days</CardDescription>
            <CardTitle className="font-display text-3xl">
              {checkinCount ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick actions</CardTitle>
          <CardDescription>
            Edit your landing page content or manage clients.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link
            href="/admin/clients"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Users className="h-4 w-4" />
            Manage clients
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/admin/site-content"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-card/70"
          >
            <FileText className="h-4 w-4" />
            Edit landing page
          </Link>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-card/70"
          >
            View live site
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
