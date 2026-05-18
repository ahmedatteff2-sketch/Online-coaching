import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Save, Timer } from 'lucide-react';
import { toast } from 'sonner';

import { useLogWorkout, useMemberTrainingPlan } from '@/api/member';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Input';
import { Empty } from '@/components/ui/Empty';
import { PageHeader } from '@/components/PageHeader';
import { RestTimer } from '@/components/RestTimer';
import { getApiErrorMessage } from '@/lib/apiError';
import type { ExerciseDef, TrainingDay } from '@/api/types';

interface SetEntry {
  setNumber: number;
  weightKg: number | '';
  reps: number | '';
  completed: boolean;
}

interface ExerciseEntry {
  ex: ExerciseDef;
  sets: SetEntry[];
}

function makeInitialEntries(day: TrainingDay): ExerciseEntry[] {
  return day.exercises.map((ex) => ({
    ex,
    sets: Array.from({ length: ex.sets }).map((_, i) => ({
      setNumber: i + 1,
      weightKg: '',
      reps: '',
      completed: false,
    })),
  }));
}

export function WorkoutDayPage() {
  const { dayId = '' } = useParams<{ dayId: string }>();
  const { data: plan, isLoading } = useMemberTrainingPlan();
  const log = useLogWorkout();

  const day = useMemo(
    () => plan?.days?.find((d) => d.id === dayId),
    [plan, dayId],
  );

  const [entries, setEntries] = useState<ExerciseEntry[] | null>(null);
  const [restSeconds, setRestSeconds] = useState<number | null>(null);

  // initialize entries when day loads
  if (day && entries === null) {
    setEntries(makeInitialEntries(day));
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Workout" />
        <div className="grid h-32 place-items-center text-ink-200">Loading...</div>
      </div>
    );
  }

  if (!day) {
    return (
      <div>
        <PageHeader title="Workout" />
        <Empty title="Workout day not found" />
      </div>
    );
  }

  function setEntry(exIndex: number, setIndex: number, patch: Partial<SetEntry>) {
    setEntries((cur) => {
      if (!cur) return cur;
      return cur.map((e, i) =>
        i === exIndex ? { ...e, sets: e.sets.map((s, j) => (j === setIndex ? { ...s, ...patch } : s)) } : e,
      );
    });
  }

  function markSet(exIndex: number, setIndex: number) {
    if (!entries) return;
    const ex = entries[exIndex].ex;
    setEntry(exIndex, setIndex, { completed: true });
    setRestSeconds(ex.restSeconds || 90);
  }

  function save() {
    if (!entries) return;
    const sets = entries.flatMap((e) =>
      e.sets
        .filter((s) => s.completed || s.weightKg !== '' || s.reps !== '')
        .map((s) => ({
          exerciseId: e.ex.id,
          setNumber: s.setNumber,
          weightKg: s.weightKg === '' ? null : Number(s.weightKg),
          reps: s.reps === '' ? null : Number(s.reps),
          completed: s.completed,
          restSecondsUsed: e.ex.restSeconds,
        })),
    );
    if (sets.length === 0) {
      toast.error('Log at least one set first');
      return;
    }
    log.mutate(
      { dayId, sets },
      {
        onSuccess: () => {
          toast.success('Workout logged');
          // reset checkboxes but keep numbers
          setEntries((cur) => cur?.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s, completed: false })) })) ?? null);
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  }

  return (
    <div className="pb-32">
      <PageHeader
        title={day.name}
        description={day.targetMuscles.join(' · ')}
        actions={
          <>
            <Link to="/member/workouts">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <Button onClick={save} loading={log.isPending}>
              <Save className="h-4 w-4" />
              Save workout
            </Button>
          </>
        }
      />

      {entries && entries.length === 0 ? (
        <Empty title="No exercises in this day" />
      ) : (
        <div className="grid gap-4">
          {entries?.map((entry, i) => (
            <Card key={entry.ex.id}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold">{entry.ex.name}</h3>
                  <p className="text-xs text-ink-300">
                    {entry.ex.muscleGroup ? `${entry.ex.muscleGroup} · ` : ''}
                    {entry.ex.sets} × {entry.ex.repsMin}–{entry.ex.repsMax} ·{' '}
                    {entry.ex.restSeconds}s rest
                  </p>
                  {entry.ex.instructions ? (
                    <p className="mt-1 text-xs text-ink-200">{entry.ex.instructions}</p>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setRestSeconds(entry.ex.restSeconds || 90)}
                >
                  <Timer className="h-4 w-4" />
                  Rest
                </Button>
              </div>

              {entry.ex.videoUrl ? (
                <a
                  href={entry.ex.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-3 inline-flex text-xs text-accent-300 underline-offset-4 hover:underline"
                >
                  Watch demo →
                </a>
              ) : null}

              <div className="grid gap-2">
                {entry.sets.map((s, j) => (
                  <div
                    key={j}
                    className="grid grid-cols-12 items-center gap-2 rounded-xl bg-ink-800/40 p-2"
                  >
                    <div className="col-span-2 grid h-10 place-items-center rounded-lg bg-ink-700 font-bold">
                      {s.setNumber}
                    </div>
                    <Field label="kg" className="col-span-4 sm:col-span-3 mb-0">
                      <Input
                        inputMode="decimal"
                        value={s.weightKg}
                        onChange={(e) =>
                          setEntry(i, j, {
                            weightKg: e.target.value === '' ? '' : Number(e.target.value),
                          })
                        }
                      />
                    </Field>
                    <Field label="reps" className="col-span-4 sm:col-span-3 mb-0">
                      <Input
                        inputMode="numeric"
                        value={s.reps}
                        onChange={(e) =>
                          setEntry(i, j, {
                            reps: e.target.value === '' ? '' : Number(e.target.value),
                          })
                        }
                      />
                    </Field>
                    <div className="col-span-2 sm:col-span-4 flex justify-end">
                      <Button
                        size="sm"
                        variant={s.completed ? 'primary' : 'secondary'}
                        onClick={() => markSet(i, j)}
                      >
                        <Check className="h-4 w-4" />
                        {s.completed ? 'Done' : 'Set done'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {restSeconds != null ? (
        <RestTimer seconds={restSeconds} onClose={() => setRestSeconds(null)} />
      ) : null}
    </div>
  );
}
