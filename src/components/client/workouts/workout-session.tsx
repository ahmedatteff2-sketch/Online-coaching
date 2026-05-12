"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logSet } from "@/lib/workouts/actions";
import { getYouTubeEmbedUrl } from "@/lib/workouts/youtube";
import { safeHttpUrl } from "@/lib/utils/safe-url";
import type { Exercise, WorkoutLog } from "@/types/database";
import type { Locale } from "@/lib/i18n/config";
import { RestTimer } from "./rest-timer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  locale: Locale;
  exercises: Exercise[];
  existingLogs: WorkoutLog[];
  today: string;
}

interface SetEntry {
  set_number: number;
  weight_kg: number;
  reps_done: number;
  persisted: boolean;
}

type LogsByExercise = Map<string, SetEntry[]>;

function buildLogMap(
  exercises: Exercise[],
  existingLogs: WorkoutLog[],
): LogsByExercise {
  const map: LogsByExercise = new Map();
  exercises.forEach((ex) => map.set(ex.id, []));
  existingLogs.forEach((log) => {
    const list = map.get(log.exercise_id);
    if (list) {
      list.push({
        set_number: log.set_number,
        weight_kg: log.weight_kg ?? 0,
        reps_done: log.reps_done ?? 0,
        persisted: true,
      });
    }
  });
  return map;
}

export function WorkoutSession({
  locale,
  exercises,
  existingLogs,
  today,
}: Props) {
  const [logs, setLogs] = useState<LogsByExercise>(() =>
    buildLogMap(exercises, existingLogs),
  );
  const [timerInfo, setTimerInfo] = useState<{
    seconds: number;
    exerciseName: string;
  } | null>(null);
  const [finished, setFinished] = useState(false);

  const markSet = useCallback((exerciseId: string, entry: SetEntry) => {
    setLogs((prev) => {
      const next = new Map(prev);
      const list = [...(next.get(exerciseId) ?? [])];
      const idx = list.findIndex((s) => s.set_number === entry.set_number);
      if (idx >= 0) list[idx] = entry;
      else list.push(entry);
      next.set(exerciseId, list);
      return next;
    });
  }, []);

  const totalVolume = useMemo(() => {
    let vol = 0;
    logs.forEach((sets) => {
      sets.forEach((s) => {
        if (s.persisted) vol += s.weight_kg * s.reps_done;
      });
    });
    return vol;
  }, [logs]);

  const totalSets = useMemo(() => {
    let count = 0;
    logs.forEach((sets) => {
      count += sets.filter((s) => s.persisted).length;
    });
    return count;
  }, [logs]);

  if (finished) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            {locale === "ar" ? "تمام! خلصت الحصة." : "Nice work!"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-3xl font-bold text-primary">
                {Math.round(totalVolume).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {locale === "ar" ? "حجم الحمل (كجم)" : "Total volume (kg)"}
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary">{totalSets}</p>
              <p className="text-xs text-muted-foreground">
                {locale === "ar" ? "مجموعات مكتملة" : "Sets completed"}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setFinished(false)}
            className="mt-4"
          >
            {locale === "ar" ? "رجوع للتمرين" : "Back to workout"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {timerInfo ? (
        <RestTimer
          key={`${timerInfo.exerciseName}-${timerInfo.seconds}-${Date.now()}`}
          seconds={timerInfo.seconds}
          exerciseName={timerInfo.exerciseName}
          locale={locale}
          onComplete={() => setTimerInfo(null)}
          onSkip={() => setTimerInfo(null)}
        />
      ) : null}

      {exercises.map((ex) => (
        <ExerciseCard
          key={ex.id}
          exercise={ex}
          locale={locale}
          today={today}
          completedSets={logs.get(ex.id) ?? []}
          onSetLogged={(entry) => {
            markSet(ex.id, entry);
            setTimerInfo({
              seconds: ex.rest_seconds,
              exerciseName: ex.name,
            });
          }}
        />
      ))}

      <div className="flex justify-end">
        <Button onClick={() => setFinished(true)} size="lg">
          {locale === "ar" ? "إنهاء الحصة" : "Finish workout"}
        </Button>
      </div>
    </div>
  );
}

function ExerciseCard({
  exercise,
  locale,
  today,
  completedSets,
  onSetLogged,
}: {
  exercise: Exercise;
  locale: Locale;
  today: string;
  completedSets: SetEntry[];
  onSetLogged: (entry: SetEntry) => void;
}) {
  const nextSetNumber = completedSets.length + 1;
  const allDone = completedSets.length >= exercise.sets;
  const embedUrl = useMemo(
    () => getYouTubeEmbedUrl(exercise.video_url),
    [exercise.video_url],
  );
  const safeVideoUrl = useMemo(
    () => safeHttpUrl(exercise.video_url),
    [exercise.video_url],
  );
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLog() {
    setError(null);
    setPending(true);
    const result = await logSet({
      exercise_id: exercise.id,
      set_number: nextSetNumber,
      weight_kg: weight,
      reps_done: reps,
      log_date: today,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Could not log set.");
      return;
    }
    onSetLogged({
      set_number: nextSetNumber,
      weight_kg: Number(weight),
      reps_done: Number(reps),
      persisted: true,
    });
    setWeight("");
    setReps("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{exercise.name}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {exercise.sets} × {exercise.reps} ·{" "}
          {locale === "ar" ? "راحة" : "rest"} {exercise.rest_seconds}s
          {!embedUrl && safeVideoUrl ? (
            <>
              {" · "}
              <a
                href={safeVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {locale === "ar" ? "فيديو" : "Video"}
              </a>
            </>
          ) : null}
        </p>
        {embedUrl ? (
          <div className="aspect-video w-full overflow-hidden rounded-md border border-border/60 bg-black">
            <iframe
              src={embedUrl}
              title={exercise.name}
              className="h-full w-full"
              loading="lazy"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : null}
        {exercise.notes ? (
          <p className="rounded-md bg-primary/5 px-3 py-2 text-xs italic text-muted-foreground">
            {exercise.notes}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {completedSets.length > 0 ? (
          <ul className="space-y-1">
            {completedSets.map((s) => (
              <li
                key={s.set_number}
                className="flex items-center gap-2 text-sm"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                  {s.set_number}
                </span>
                {s.weight_kg} kg × {s.reps_done} reps
              </li>
            ))}
          </ul>
        ) : null}

        {allDone ? (
          <p className="text-sm font-medium text-primary">
            {locale === "ar" ? "كل المجموعات تمت!" : "All sets complete!"}
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <div className="w-20 space-y-1">
              <label className="text-xs text-muted-foreground">
                {locale === "ar" ? "الوزن" : "Weight"}
              </label>
              <Input
                type="number"
                step="0.5"
                min="0"
                placeholder="kg"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
            <div className="w-20 space-y-1">
              <label className="text-xs text-muted-foreground">
                {locale === "ar" ? "العدات" : "Reps"}
              </label>
              <Input
                type="number"
                min="0"
                placeholder="#"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              disabled={isPending || !weight || !reps}
              onClick={handleLog}
            >
              {isPending
                ? "…"
                : locale === "ar"
                  ? `سيت ${nextSetNumber} — تم`
                  : `Set ${nextSetNumber} — Done`}
            </Button>
          </div>
        )}
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
