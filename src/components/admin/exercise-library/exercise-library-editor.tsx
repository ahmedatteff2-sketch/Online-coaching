"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  deleteExerciseLibraryItem,
  upsertExerciseLibraryItem,
} from "@/lib/exercise-library/actions";
import type { ExerciseLibraryItem, MuscleGroup } from "@/types/database";
import type { Locale } from "@/lib/i18n/config";

interface Props {
  locale: Locale;
  items: ExerciseLibraryItem[];
}

const GROUPS: MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "legs",
  "glutes",
  "core",
  "cardio",
  "full_body",
  "other",
];

function groupLabel(g: MuscleGroup, locale: Locale): string {
  const en: Record<MuscleGroup, string> = {
    chest: "Chest",
    back: "Back",
    shoulders: "Shoulders",
    arms: "Arms",
    legs: "Legs",
    glutes: "Glutes",
    core: "Core",
    cardio: "Cardio",
    full_body: "Full body",
    other: "Other",
  };
  const ar: Record<MuscleGroup, string> = {
    chest: "صدر",
    back: "ظهر",
    shoulders: "أكتاف",
    arms: "ذراعين",
    legs: "أرجل",
    glutes: "مؤخرة",
    core: "بطن",
    cardio: "كارديو",
    full_body: "جسم كامل",
    other: "أخرى",
  };
  return locale === "ar" ? ar[g] : en[g];
}

export function ExerciseLibraryEditor({ locale, items }: Props) {
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<"all" | MuscleGroup>("all");
  const [editing, setEditing] = useState<ExerciseLibraryItem | null>(null);
  const [adding, setAdding] = useState(false);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (groupFilter !== "all" && i.muscle_group !== groupFilter) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        (i.name_ar?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [items, query, groupFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={locale === "ar" ? "بحث…" : "Search…"}
            className="ps-9"
          />
        </div>
        <select
          value={groupFilter}
          onChange={(e) =>
            setGroupFilter(e.target.value as "all" | MuscleGroup)
          }
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="all">
            {locale === "ar" ? "كل المجموعات" : "All groups"}
          </option>
          {GROUPS.map((g) => (
            <option key={g} value={g}>
              {groupLabel(g, locale)}
            </option>
          ))}
        </select>
        <Button
          type="button"
          onClick={() => {
            setEditing(null);
            setAdding(true);
          }}
        >
          <Plus className="h-4 w-4" />
          {locale === "ar" ? "تمرين جديد" : "New exercise"}
        </Button>
      </div>

      {(adding || editing) && (
        <ExerciseForm
          locale={locale}
          existing={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-start text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pe-3 text-start">
                {locale === "ar" ? "الاسم" : "Name"}
              </th>
              <th className="py-2 pe-3 text-start">
                {locale === "ar" ? "المجموعة" : "Group"}
              </th>
              <th className="py-2 pe-3 text-end">
                {locale === "ar" ? "ست" : "Sets"}
              </th>
              <th className="py-2 pe-3 text-end">
                {locale === "ar" ? "تكرار" : "Reps"}
              </th>
              <th className="py-2 pe-3 text-end">
                {locale === "ar" ? "راحة" : "Rest"}
              </th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr
                key={i.id}
                className="border-b border-border/30 last:border-0"
              >
                <td className="py-2 pe-3">
                  <p className="font-medium">{i.name}</p>
                  {i.name_ar ? (
                    <p className="text-xs text-muted-foreground">{i.name_ar}</p>
                  ) : null}
                </td>
                <td className="py-2 pe-3">
                  <span className="rounded-full bg-card px-2 py-0.5 text-xs">
                    {groupLabel(i.muscle_group, locale)}
                  </span>
                </td>
                <td className="py-2 pe-3 text-end tabular-nums">
                  {i.default_sets}
                </td>
                <td className="py-2 pe-3 text-end">{i.default_reps}</td>
                <td className="py-2 pe-3 text-end tabular-nums">
                  {i.default_rest_seconds}s
                </td>
                <td className="py-2 text-end">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setAdding(false);
                        setEditing(i);
                      }}
                      className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-card hover:text-foreground"
                    >
                      {locale === "ar" ? "تعديل" : "Edit"}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        const ok = window.confirm(
                          locale === "ar"
                            ? "حذف التمرين ده من المكتبة؟"
                            : "Remove this exercise from the library?",
                        );
                        if (!ok) return;
                        startTransition(async () => {
                          const result = await deleteExerciseLibraryItem(i.id);
                          if (!result.ok) {
                            setError(result.error ?? "Delete failed.");
                          } else {
                            router.refresh();
                          }
                        });
                      }}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-destructive hover:bg-destructive/10"
                      aria-label={locale === "ar" ? "حذف" : "Delete"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  {locale === "ar" ? "مفيش نتايج." : "No matches."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ExerciseForm({
  locale,
  existing,
  onClose,
}: {
  locale: Locale;
  existing: ExerciseLibraryItem | null;
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
        startTransition(async () => {
          const result = await upsertExerciseLibraryItem({
            id: existing?.id,
            name: String(fd.get("name") ?? ""),
            name_ar: String(fd.get("name_ar") ?? ""),
            muscle_group: String(fd.get("muscle_group") ?? "other"),
            default_sets: String(fd.get("default_sets") ?? ""),
            default_reps: String(fd.get("default_reps") ?? ""),
            default_rest_seconds: String(fd.get("default_rest_seconds") ?? ""),
            default_notes: String(fd.get("default_notes") ?? ""),
            video_url: String(fd.get("video_url") ?? ""),
            image_url: String(fd.get("image_url") ?? ""),
            gif_url: String(fd.get("gif_url") ?? ""),
          });
          if (!result.ok) {
            setError(result.error ?? "Save failed.");
            return;
          }
          router.refresh();
          onClose();
        });
      }}
      className="space-y-4 rounded-lg border border-border bg-card/40 p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {existing
            ? locale === "ar"
              ? "تعديل تمرين"
              : "Edit exercise"
            : locale === "ar"
              ? "تمرين جديد"
              : "New exercise"}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-card hover:text-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="lib-name">
            {locale === "ar" ? "الاسم بالإنجليزي" : "Name (English)"}
          </Label>
          <Input
            id="lib-name"
            name="name"
            defaultValue={existing?.name ?? ""}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="lib-name-ar">
            {locale === "ar" ? "الاسم بالعربي" : "Name (Arabic)"}
          </Label>
          <Input
            id="lib-name-ar"
            name="name_ar"
            defaultValue={existing?.name_ar ?? ""}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="lib-group">
            {locale === "ar" ? "المجموعة العضلية" : "Muscle group"}
          </Label>
          <select
            id="lib-group"
            name="muscle_group"
            defaultValue={existing?.muscle_group ?? "other"}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
          >
            {GROUPS.map((g) => (
              <option key={g} value={g}>
                {groupLabel(g, locale)}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label htmlFor="lib-sets">{locale === "ar" ? "ست" : "Sets"}</Label>
            <Input
              id="lib-sets"
              name="default_sets"
              type="number"
              min={1}
              defaultValue={existing?.default_sets ?? 3}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lib-reps">
              {locale === "ar" ? "تكرار" : "Reps"}
            </Label>
            <Input
              id="lib-reps"
              name="default_reps"
              defaultValue={existing?.default_reps ?? "8-12"}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lib-rest">
              {locale === "ar" ? "راحة (ث)" : "Rest (s)"}
            </Label>
            <Input
              id="lib-rest"
              name="default_rest_seconds"
              type="number"
              min={0}
              defaultValue={existing?.default_rest_seconds ?? 90}
              required
            />
          </div>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="lib-notes">
            {locale === "ar" ? "ملاحظات افتراضية" : "Default notes"}
          </Label>
          <Input
            id="lib-notes"
            name="default_notes"
            defaultValue={existing?.default_notes ?? ""}
            placeholder={
              locale === "ar"
                ? "نصايح فورم، تركيز، إلخ"
                : "Form cues, tempo, focus, etc."
            }
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="lib-video">
            {locale === "ar" ? "رابط فيديو" : "Video URL"}
          </Label>
          <Input
            id="lib-video"
            name="video_url"
            defaultValue={existing?.video_url ?? ""}
            placeholder="https://youtu.be/..."
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="lib-image">
            {locale === "ar" ? "رابط صورة" : "Image URL"}
          </Label>
          <Input
            id="lib-image"
            name="image_url"
            defaultValue={existing?.image_url ?? ""}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="lib-gif">
            {locale === "ar" ? "رابط GIF" : "GIF URL"}
          </Label>
          <Input
            id="lib-gif"
            name="gif_url"
            defaultValue={existing?.gif_url ?? ""}
            placeholder="https://..."
          />
        </div>
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={isPending}
        >
          {locale === "ar" ? "إلغاء" : "Cancel"}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending
            ? locale === "ar"
              ? "جاري الحفظ…"
              : "Saving…"
            : locale === "ar"
              ? "حفظ"
              : "Save"}
        </Button>
      </div>
    </form>
  );
}
