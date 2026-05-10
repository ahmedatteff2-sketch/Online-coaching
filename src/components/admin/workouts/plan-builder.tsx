"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  addDay,
  createPlan,
  deleteDay,
  renameDay,
  renamePlan,
  updatePlanNotes,
} from "@/lib/workouts/actions";
import type { Locale } from "@/lib/i18n/config";
import type { PlanWithDays } from "@/lib/workouts/queries";
import type { ExerciseLibraryItem } from "@/types/database";
import { DayExercises } from "./day-exercises";

interface Props {
  clientId: string;
  locale: Locale;
  plan: PlanWithDays | null;
  library: ExerciseLibraryItem[];
}

export function PlanBuilder({ clientId, locale, plan, library }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!plan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {locale === "ar"
              ? "ابدأ خطة جديدة لهذا العميل"
              : "Start a new plan for this client"}
          </CardTitle>
          <CardDescription>
            {locale === "ar"
              ? "اختار اسم للخطة وهنبدأ نضيف الأيام والتمارين."
              : "Pick a name — you'll add days and exercises next."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                const result = await createPlan(
                  clientId,
                  String(fd.get("name") ?? ""),
                );
                if (!result.ok) {
                  setError(result.error ?? "Could not create plan.");
                  return;
                }
                router.refresh();
              });
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="min-w-[240px] flex-1 space-y-2">
              <Label htmlFor="plan-name">
                {locale === "ar" ? "اسم الخطة" : "Plan name"}
              </Label>
              <Input
                id="plan-name"
                name="name"
                placeholder={
                  locale === "ar" ? "مثال: PPL 6 أيام" : "e.g. PPL 6-day"
                }
                required
              />
            </div>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? locale === "ar"
                  ? "جاري الإنشاء…"
                  : "Creating…"
                : locale === "ar"
                  ? "إنشاء الخطة"
                  : "Create plan"}
            </Button>
            {error ? (
              <p className="w-full text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PlanHeader
        clientId={clientId}
        locale={locale}
        planId={plan.plan.id}
        initialName={plan.plan.name}
      />

      <PlanNotesEditor
        clientId={clientId}
        locale={locale}
        planId={plan.plan.id}
        initialGeneral={plan.plan.general_notes ?? ""}
        initialAttention={plan.plan.attention_notes ?? ""}
      />

      <div className="space-y-4">
        {plan.days.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              {locale === "ar"
                ? "مفيش أيام في الخطة لسه."
                : "No days yet — add your first below."}
            </CardContent>
          </Card>
        ) : (
          plan.days.map((d) => (
            <DayCard
              key={d.day.id}
              clientId={clientId}
              locale={locale}
              dayId={d.day.id}
              dayNumber={d.day.day_number}
              dayName={d.day.day_name}
              exercises={d.exercises}
              library={library}
            />
          ))
        )}

        <AddDayForm clientId={clientId} locale={locale} planId={plan.plan.id} />
      </div>
    </div>
  );
}

function PlanHeader({
  clientId,
  locale,
  planId,
  initialName,
}: {
  clientId: string;
  locale: Locale;
  planId: string;
  initialName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {locale === "ar" ? "اسم الخطة" : "Plan name"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSaved(false);
            setError(null);
            startTransition(async () => {
              const result = await renamePlan(planId, clientId, name);
              if (!result.ok) {
                setError(result.error ?? "Save failed.");
                return;
              }
              setSaved(true);
              router.refresh();
            });
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="min-w-[240px] flex-1 space-y-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <Button type="submit" variant="outline" disabled={isPending}>
            {isPending
              ? locale === "ar"
                ? "جاري الحفظ…"
                : "Saving…"
              : locale === "ar"
                ? "حفظ"
                : "Save"}
          </Button>
          {saved ? (
            <p className="text-sm text-primary">
              {locale === "ar" ? "تم الحفظ ✓" : "Saved ✓"}
            </p>
          ) : null}
          {error ? (
            <p className="w-full text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

function PlanNotesEditor({
  clientId,
  locale,
  planId,
  initialGeneral,
  initialAttention,
}: {
  clientId: string;
  locale: Locale;
  planId: string;
  initialGeneral: string;
  initialAttention: string;
}) {
  const router = useRouter();
  const [general, setGeneral] = useState(initialGeneral);
  const [attention, setAttention] = useState(initialAttention);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {locale === "ar" ? "ملاحظات الكوتش" : "Coach notes"}
        </CardTitle>
        <CardDescription>
          {locale === "ar"
            ? "بتظهر للعميل في صفحة التمارين. «احترس» بتتبرز في كرت أصفر فوق التمارين."
            : "Shown to the client on their workouts page. “Attention” items render as a highlighted callout above the day's exercises."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSaved(false);
            setError(null);
            startTransition(async () => {
              const result = await updatePlanNotes(
                planId,
                clientId,
                general,
                attention,
              );
              if (!result.ok) {
                setError(result.error ?? "Save failed.");
                return;
              }
              setSaved(true);
              router.refresh();
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="general-notes">
              {locale === "ar"
                ? "ملاحظات عامة (Mind-muscle, tempo, إلخ)"
                : "General notes (mind-muscle, tempo, etc.)"}
            </Label>
            <Textarea
              id="general-notes"
              value={general}
              onChange={(e) => setGeneral(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder={
                locale === "ar"
                  ? "مثلاً: ركّز على mind-muscle connection في كل سيت."
                  : "e.g. Focus on the mind-muscle connection on every set."
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="attention-notes">
              {locale === "ar"
                ? "احترس / لازم تخلي بالك (هتظهر مميزة)"
                : "Attention items (rendered highlighted)"}
            </Label>
            <Textarea
              id="attention-notes"
              value={attention}
              onChange={(e) => setAttention(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder={
                locale === "ar"
                  ? "مثلاً: لو عندك ألم في الظهر، استبدل الـ deadlift بـ rack pull."
                  : "e.g. Skip the deadlift and use a rack pull if your lower back is sore."
              }
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="outline" disabled={isPending}>
              {isPending
                ? locale === "ar"
                  ? "جاري الحفظ…"
                  : "Saving…"
                : locale === "ar"
                  ? "حفظ الملاحظات"
                  : "Save notes"}
            </Button>
            {saved ? (
              <p className="text-sm text-primary">
                {locale === "ar" ? "تم الحفظ ✓" : "Saved ✓"}
              </p>
            ) : null}
            {error ? (
              <p className="w-full text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          {attention.trim() ? (
            <div
              className="flex items-start gap-2 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200"
              aria-live="polite"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="whitespace-pre-wrap leading-relaxed">
                {attention}
              </span>
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}

function DayCard({
  clientId,
  locale,
  dayId,
  dayNumber,
  dayName,
  exercises,
  library,
}: {
  clientId: string;
  locale: Locale;
  dayId: string;
  dayNumber: number;
  dayName: string;
  exercises: import("@/types/database").Exercise[];
  library: ExerciseLibraryItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(dayName);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center gap-3 space-y-0">
        <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          {locale === "ar" ? `يوم ${dayNumber}` : `Day ${dayNumber}`}
        </span>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name.trim() === dayName) return;
            startTransition(async () => {
              const result = await renameDay(dayId, clientId, name);
              if (!result.ok) {
                setError(result.error ?? "Save failed.");
              } else {
                router.refresh();
              }
            });
          }}
          className="max-w-xs"
        />
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            const ok = window.confirm(
              locale === "ar"
                ? "تحب تمسح اليوم ده وكل تماريه؟"
                : "Delete this day and all its exercises?",
            );
            if (!ok) return;
            startTransition(async () => {
              const result = await deleteDay(dayId, clientId);
              if (!result.ok) {
                setError(result.error ?? "Delete failed.");
              } else {
                router.refresh();
              }
            });
          }}
          className="ms-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
          {locale === "ar" ? "حذف اليوم" : "Delete day"}
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <DayExercises
          dayId={dayId}
          clientId={clientId}
          locale={locale}
          exercises={exercises}
          library={library}
        />
      </CardContent>
    </Card>
  );
}

function AddDayForm({
  clientId,
  locale,
  planId,
}: {
  clientId: string;
  locale: Locale;
  planId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await addDay(
            planId,
            clientId,
            String(fd.get("day_name") ?? ""),
          );
          if (!result.ok) {
            setError(result.error ?? "Could not add day.");
            return;
          }
          (e.target as HTMLFormElement).reset();
          router.refresh();
        });
      }}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-border/60 bg-card/40 p-4"
    >
      <div className="min-w-[240px] flex-1 space-y-2">
        <Label htmlFor="day_name">
          {locale === "ar" ? "إضافة يوم جديد" : "Add a day"}
        </Label>
        <Input
          id="day_name"
          name="day_name"
          placeholder={
            locale === "ar"
              ? "مثال: دفع | سحب | أرجل"
              : "e.g. Push / Pull / Legs"
          }
        />
      </div>
      <Button type="submit" disabled={isPending}>
        <Plus className="h-4 w-4" />
        {isPending
          ? locale === "ar"
            ? "جاري الإضافة…"
            : "Adding…"
          : locale === "ar"
            ? "إضافة يوم"
            : "Add day"}
      </Button>
      {error ? (
        <p className="w-full text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
