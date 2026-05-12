import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getDayWithExercises,
  getPlanNotesForDay,
  getWorkoutLogsForDate,
} from "@/lib/workouts/queries";
import { readLocaleFromCookie } from "@/lib/i18n/locale-cookie";
import { WorkoutSession } from "@/components/client/workouts/workout-session";

export const dynamic = "force-dynamic";

export default async function ClientWorkoutDayPage(
  props: {
    params: Promise<{ dayId: string }>;
  }
) {
  const params = await props.params;
  const [dayData, planNotes] = await Promise.all([
    getDayWithExercises(params.dayId),
    getPlanNotesForDay(params.dayId),
  ]);
  if (!dayData) notFound();
  const locale = readLocaleFromCookie();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: clientRow } = (await supabase
    .from("clients")
    .select("id")
    .eq("user_id", user!.id)
    .maybeSingle()) as { data: { id: string } | null };

  const today = new Date().toISOString().slice(0, 10);
  const exerciseIds = dayData.exercises.map((e) => e.id);
  const existingLogs = clientRow
    ? await getWorkoutLogsForDate(clientRow.id, today, exerciseIds)
    : [];

  return (
    <div className="space-y-4">
      <Link
        href="/client/workouts"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {locale === "ar" ? "كل الأيام" : "All days"}
      </Link>
      <div>
        <p className="text-sm uppercase tracking-wider text-muted-foreground">
          {locale === "ar"
            ? `يوم ${dayData.day.day_number}`
            : `Day ${dayData.day.day_number}`}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {dayData.day.day_name}
        </h1>
      </div>

      {planNotes.attention_notes ? (
        <div
          className="flex items-start gap-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200"
          role="note"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider">
              {locale === "ar" ? "لازم تخلي بالك" : "Heads up"}
            </p>
            <p className="whitespace-pre-wrap leading-relaxed">
              {planNotes.attention_notes}
            </p>
          </div>
        </div>
      ) : null}

      <WorkoutSession
        locale={locale}
        exercises={dayData.exercises}
        existingLogs={existingLogs}
        today={today}
      />
    </div>
  );
}
