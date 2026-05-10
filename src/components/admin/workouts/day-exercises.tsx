"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addExercise,
  deleteExercise,
  updateExercise,
  type ExerciseInput,
} from "@/lib/workouts/actions";
import { addExerciseFromLibrary } from "@/lib/exercise-library/actions";
import type { Exercise, ExerciseLibraryItem } from "@/types/database";
import type { Locale } from "@/lib/i18n/config";

interface Props {
  dayId: string;
  clientId: string;
  locale: Locale;
  exercises: Exercise[];
  library: ExerciseLibraryItem[];
}

export function DayExercises({
  dayId,
  clientId,
  locale,
  exercises,
  library,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [picking, setPicking] = useState(false);

  return (
    <div className="space-y-3">
      {exercises.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {locale === "ar" ? "مفيش تمارين لسه." : "No exercises yet."}
        </p>
      ) : (
        <ul className="space-y-2">
          {exercises.map((ex) => (
            <ExerciseRow
              key={ex.id}
              clientId={clientId}
              locale={locale}
              exercise={ex}
            />
          ))}
        </ul>
      )}

      {adding ? (
        <ExerciseForm
          clientId={clientId}
          locale={locale}
          dayId={dayId}
          onClose={() => setAdding(false)}
        />
      ) : picking ? (
        <LibraryPicker
          clientId={clientId}
          dayId={dayId}
          locale={locale}
          library={library}
          onClose={() => setPicking(false)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-card/60 px-3 py-2 text-sm text-muted-foreground hover:bg-card hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            {locale === "ar" ? "إضافة تمرين" : "Add exercise"}
          </button>
          <button
            type="button"
            disabled={library.length === 0}
            onClick={() => setPicking(true)}
            className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <BookOpen className="h-4 w-4" />
            {locale === "ar" ? "إضافة من المكتبة" : "Add from library"}
          </button>
        </div>
      )}
    </div>
  );
}

function LibraryPicker({
  clientId,
  dayId,
  locale,
  library,
  onClose,
}: {
  clientId: string;
  dayId: string;
  locale: Locale;
  library: ExerciseLibraryItem[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q
    ? library.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.name_ar?.toLowerCase().includes(q) ?? false),
      )
    : library;

  return (
    <div className="space-y-3 rounded-md border border-border/60 bg-card/80 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          {locale === "ar" ? "اختار تمرين من المكتبة" : "Pick from the library"}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={locale === "ar" ? "بحث…" : "Search…"}
      />
      <div className="max-h-60 overflow-auto rounded border border-border/40">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            {locale === "ar" ? "مفيش نتايج." : "No matches."}
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {filtered.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.muscle_group} · {item.default_sets}×
                    {item.default_reps} · {item.default_rest_seconds}s
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={isPending}
                  onClick={() => {
                    setError(null);
                    startTransition(async () => {
                      const result = await addExerciseFromLibrary({
                        day_id: dayId,
                        client_id: clientId,
                        library_id: item.id,
                      });
                      if (!result.ok) {
                        setError(result.error ?? "Add failed.");
                        return;
                      }
                      router.refresh();
                    });
                  }}
                >
                  {locale === "ar" ? "إضافة" : "Add"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ExerciseRow({
  clientId,
  locale,
  exercise,
}: {
  clientId: string;
  locale: Locale;
  exercise: Exercise;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <li>
        <ExerciseForm
          clientId={clientId}
          locale={locale}
          dayId={exercise.day_id}
          existing={exercise}
          onClose={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-start gap-3 rounded-md border border-border/60 bg-card/60 p-3">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium">{exercise.name}</p>
        <p className="text-xs text-muted-foreground">
          {exercise.sets} × {exercise.reps} ·{" "}
          {locale === "ar" ? "راحة" : "rest"} {exercise.rest_seconds}s
          {exercise.video_url ? (
            <>
              {" · "}
              <a
                href={exercise.video_url}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                {locale === "ar" ? "فيديو" : "Video"}
              </a>
            </>
          ) : null}
        </p>
        {exercise.notes ? (
          <p className="text-xs italic text-muted-foreground">
            {exercise.notes}
          </p>
        ) : null}
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-card hover:text-foreground"
          aria-label={locale === "ar" ? "تعديل" : "Edit"}
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            const ok = window.confirm(
              locale === "ar"
                ? "تحب تمسح التمرين ده؟"
                : "Delete this exercise?",
            );
            if (!ok) return;
            startTransition(async () => {
              const result = await deleteExercise(exercise.id, clientId);
              if (!result.ok) {
                setError(result.error ?? "Delete failed.");
              } else {
                router.refresh();
              }
            });
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
          aria-label={locale === "ar" ? "حذف" : "Delete"}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function ExerciseForm({
  clientId,
  locale,
  dayId,
  existing,
  onClose,
}: {
  clientId: string;
  locale: Locale;
  dayId: string;
  existing?: Exercise;
  onClose: () => void;
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
        const input: ExerciseInput = {
          name: String(fd.get("name") ?? ""),
          sets: String(fd.get("sets") ?? ""),
          reps: String(fd.get("reps") ?? ""),
          rest_seconds: String(fd.get("rest_seconds") ?? ""),
          notes: String(fd.get("notes") ?? ""),
          video_url: String(fd.get("video_url") ?? ""),
        };
        startTransition(async () => {
          const result = existing
            ? await updateExercise(existing.id, clientId, input)
            : await addExercise(dayId, clientId, input);
          if (!result.ok) {
            setError(result.error ?? "Save failed.");
            return;
          }
          onClose();
          router.refresh();
        });
      }}
      className="space-y-3 rounded-md border border-border/60 bg-card/80 p-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">
          {existing
            ? locale === "ar"
              ? "تعديل التمرين"
              : "Edit exercise"
            : locale === "ar"
              ? "تمرين جديد"
              : "New exercise"}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1 sm:col-span-4">
          <Label htmlFor="name">
            {locale === "ar" ? "اسم التمرين" : "Exercise name"}
          </Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={existing?.name ?? ""}
            placeholder={
              locale === "ar" ? "مثال: بنش بريس" : "e.g. Barbell Bench Press"
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sets">{locale === "ar" ? "المجموعات" : "Sets"}</Label>
          <Input
            id="sets"
            name="sets"
            type="number"
            min={1}
            required
            defaultValue={existing?.sets ?? 3}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="reps">{locale === "ar" ? "العدات" : "Reps"}</Label>
          <Input
            id="reps"
            name="reps"
            required
            defaultValue={existing?.reps ?? "8-12"}
            placeholder="8-12"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="rest_seconds">
            {locale === "ar" ? "الراحة (ثواني)" : "Rest (seconds)"}
          </Label>
          <Input
            id="rest_seconds"
            name="rest_seconds"
            type="number"
            min={0}
            defaultValue={existing?.rest_seconds ?? 90}
            required
          />
        </div>
        <div className="space-y-1 sm:col-span-4">
          <Label htmlFor="video_url">
            {locale === "ar" ? "رابط فيديو (اختياري)" : "Video URL (optional)"}
          </Label>
          <Input
            id="video_url"
            name="video_url"
            type="url"
            defaultValue={existing?.video_url ?? ""}
            placeholder="https://youtube.com/..."
          />
        </div>
        <div className="space-y-1 sm:col-span-4">
          <Label htmlFor="notes">
            {locale === "ar" ? "ملاحظات الكوتش" : "Coach notes"}
          </Label>
          <Textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={existing?.notes ?? ""}
            placeholder={
              locale === "ar"
                ? "ركّز على ربط العضلة بالعقل."
                : "Focus on mind-muscle connection."
            }
          />
        </div>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>
          {locale === "ar" ? "إلغاء" : "Cancel"}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? locale === "ar"
              ? "جاري الحفظ…"
              : "Saving…"
            : existing
              ? locale === "ar"
                ? "حفظ التغييرات"
                : "Save changes"
              : locale === "ar"
                ? "إضافة التمرين"
                : "Add exercise"}
        </Button>
      </div>
    </form>
  );
}
