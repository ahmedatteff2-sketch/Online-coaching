import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { useTrainingPlan, useUpdateTrainingPlan } from '@/api/admin';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { PageHeader } from '@/components/PageHeader';
import { Empty } from '@/components/ui/Empty';
import { getApiErrorMessage } from '@/lib/apiError';

interface ExerciseDraft {
  id?: string;
  name: string;
  muscleGroup: string;
  videoUrl: string;
  instructions: string;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  notes: string;
  order: number;
}

interface DayDraft {
  id?: string;
  dayNumber: number;
  name: string;
  targetMuscles: string;
  notes: string;
  exercises: ExerciseDraft[];
}

export function TrainingPlanEditorPage() {
  const { id = '' } = useParams();
  const { data, isLoading } = useTrainingPlan(id);
  const update = useUpdateTrainingPlan();

  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [notes, setNotes] = useState('');
  const [days, setDays] = useState<DayDraft[]>([]);

  useEffect(() => {
    if (!data) return;
    setName(data.name);
    setGoal(data.goal ?? '');
    setDaysPerWeek(data.daysPerWeek);
    setNotes(data.notes ?? '');
    setDays(
      (data.days ?? []).map((d) => ({
        id: d.id,
        dayNumber: d.dayNumber,
        name: d.name,
        targetMuscles: d.targetMuscles.join(', '),
        notes: d.notes ?? '',
        exercises: d.exercises.map((e, i) => ({
          id: e.id,
          name: e.name,
          muscleGroup: e.muscleGroup ?? '',
          videoUrl: e.videoUrl ?? '',
          instructions: e.instructions ?? '',
          sets: e.sets,
          repsMin: e.repsMin,
          repsMax: e.repsMax,
          restSeconds: e.restSeconds,
          notes: e.notes ?? '',
          order: e.order ?? i,
        })),
      })),
    );
  }, [data]);

  if (isLoading || !data) {
    return (
      <div>
        <PageHeader title="Training plan" />
        <div className="grid h-32 place-items-center text-ink-200">Loading...</div>
      </div>
    );
  }

  function addDay() {
    setDays((d) => [
      ...d,
      {
        dayNumber: d.length + 1,
        name: `Day ${d.length + 1}`,
        targetMuscles: '',
        notes: '',
        exercises: [],
      },
    ]);
  }

  function removeDay(index: number) {
    setDays((d) => d.filter((_, i) => i !== index));
  }

  function updateDay(index: number, patch: Partial<DayDraft>) {
    setDays((d) => d.map((day, i) => (i === index ? { ...day, ...patch } : day)));
  }

  function addExercise(dayIndex: number) {
    setDays((d) =>
      d.map((day, i) =>
        i === dayIndex
          ? {
              ...day,
              exercises: [
                ...day.exercises,
                {
                  name: '',
                  muscleGroup: '',
                  videoUrl: '',
                  instructions: '',
                  sets: 3,
                  repsMin: 8,
                  repsMax: 12,
                  restSeconds: 90,
                  notes: '',
                  order: day.exercises.length,
                },
              ],
            }
          : day,
      ),
    );
  }

  function updateExercise(dayIndex: number, exIndex: number, patch: Partial<ExerciseDraft>) {
    setDays((d) =>
      d.map((day, i) =>
        i === dayIndex
          ? {
              ...day,
              exercises: day.exercises.map((e, j) => (j === exIndex ? { ...e, ...patch } : e)),
            }
          : day,
      ),
    );
  }

  function removeExercise(dayIndex: number, exIndex: number) {
    setDays((d) =>
      d.map((day, i) =>
        i === dayIndex ? { ...day, exercises: day.exercises.filter((_, j) => j !== exIndex) } : day,
      ),
    );
  }

  function save() {
    update.mutate(
      {
        id,
        body: {
          name,
          goal: goal || null,
          daysPerWeek,
          notes: notes || null,
          days: days.map((d, i) => ({
            dayNumber: d.dayNumber || i + 1,
            name: d.name,
            targetMuscles: d.targetMuscles.split(',').map((s) => s.trim()).filter(Boolean),
            notes: d.notes || null,
            exercises: d.exercises.map((e, j) => ({
              name: e.name,
              muscleGroup: e.muscleGroup || null,
              videoUrl: e.videoUrl || null,
              instructions: e.instructions || null,
              sets: e.sets,
              repsMin: e.repsMin,
              repsMax: e.repsMax,
              restSeconds: e.restSeconds,
              notes: e.notes || null,
              order: j,
            })),
          })),
        },
      },
      {
        onSuccess: () => toast.success('Plan saved'),
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  }

  return (
    <div>
      <PageHeader
        title={`Edit plan`}
        description={data.member ? `For ${data.member.fullName}` : 'Template'}
        actions={
          <>
            <Link to="/admin/training-plans">
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <Button loading={update.isPending} onClick={save}>
              <Save className="h-4 w-4" />
              Save plan
            </Button>
          </>
        }
      />

      <Card className="mb-6">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <Field label="Plan name">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Goal">
            <Select value={goal} onChange={(e) => setGoal(e.target.value)}>
              <option value="">—</option>
              <option value="MUSCLE_GAIN">Muscle gain</option>
              <option value="FAT_LOSS">Fat loss</option>
              <option value="STRENGTH">Strength</option>
              <option value="ENDURANCE">Endurance</option>
              <option value="GENERAL_FITNESS">General fitness</option>
            </Select>
          </Field>
          <Field label="Days per week">
            <Input
              type="number"
              min={1}
              max={7}
              value={daysPerWeek}
              onChange={(e) => setDaysPerWeek(Math.max(1, Math.min(7, Number(e.target.value))))}
            />
          </Field>
        </div>
        <div className="mt-3">
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </Field>
        </div>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Workout days</h2>
        <Button size="sm" variant="secondary" onClick={addDay}>
          <Plus className="h-4 w-4" />
          Add day
        </Button>
      </div>

      {days.length === 0 ? (
        <Empty
          title="No workout days yet"
          action={<Button onClick={addDay}>Add first day</Button>}
        />
      ) : (
        <div className="grid gap-4">
          {days.map((day, dayIndex) => (
            <Card key={dayIndex}>
              <div className="mb-3 grid gap-3 sm:grid-cols-3">
                <Field label="Day name">
                  <Input
                    value={day.name}
                    onChange={(e) => updateDay(dayIndex, { name: e.target.value })}
                  />
                </Field>
                <Field label="Day #">
                  <Input
                    type="number"
                    value={day.dayNumber}
                    onChange={(e) => updateDay(dayIndex, { dayNumber: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Target muscles (comma sep.)">
                  <Input
                    value={day.targetMuscles}
                    onChange={(e) => updateDay(dayIndex, { targetMuscles: e.target.value })}
                    placeholder="Chest, Triceps"
                  />
                </Field>
              </div>

              <div className="space-y-3">
                {day.exercises.map((ex, exIndex) => (
                  <div
                    key={exIndex}
                    className="rounded-xl border border-ink-700/60 bg-ink-800/40 p-3"
                  >
                    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                      <Field label="Exercise">
                        <Input
                          value={ex.name}
                          onChange={(e) => updateExercise(dayIndex, exIndex, { name: e.target.value })}
                          placeholder="Barbell Bench Press"
                        />
                      </Field>
                      <Field label="Muscle group">
                        <Input
                          value={ex.muscleGroup}
                          onChange={(e) =>
                            updateExercise(dayIndex, exIndex, { muscleGroup: e.target.value })
                          }
                          placeholder="Chest"
                        />
                      </Field>
                      <Field label="Sets">
                        <Input
                          type="number"
                          value={ex.sets}
                          onChange={(e) =>
                            updateExercise(dayIndex, exIndex, { sets: Number(e.target.value) })
                          }
                        />
                      </Field>
                      <Field label="Rest (sec)">
                        <Input
                          type="number"
                          value={ex.restSeconds}
                          onChange={(e) =>
                            updateExercise(dayIndex, exIndex, { restSeconds: Number(e.target.value) })
                          }
                        />
                      </Field>
                      <Field label="Reps min">
                        <Input
                          type="number"
                          value={ex.repsMin}
                          onChange={(e) =>
                            updateExercise(dayIndex, exIndex, { repsMin: Number(e.target.value) })
                          }
                        />
                      </Field>
                      <Field label="Reps max">
                        <Input
                          type="number"
                          value={ex.repsMax}
                          onChange={(e) =>
                            updateExercise(dayIndex, exIndex, { repsMax: Number(e.target.value) })
                          }
                        />
                      </Field>
                      <Field label="Video URL">
                        <Input
                          value={ex.videoUrl}
                          onChange={(e) =>
                            updateExercise(dayIndex, exIndex, { videoUrl: e.target.value })
                          }
                          placeholder="https://youtu.be/..."
                        />
                      </Field>
                      <Field label="Notes">
                        <Input
                          value={ex.notes}
                          onChange={(e) =>
                            updateExercise(dayIndex, exIndex, { notes: e.target.value })
                          }
                        />
                      </Field>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeExercise(dayIndex, exIndex)}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => addExercise(dayIndex)}>
                  <Plus className="h-4 w-4" />
                  Add exercise
                </Button>
                <Button size="sm" variant="ghost" onClick={() => removeDay(dayIndex)}>
                  <Trash2 className="h-4 w-4 text-danger" />
                  Remove day
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
