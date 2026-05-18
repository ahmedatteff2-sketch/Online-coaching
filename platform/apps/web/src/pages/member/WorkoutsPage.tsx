import { Link } from 'react-router-dom';
import { Dumbbell, ChevronRight } from 'lucide-react';
import { useMemberTrainingPlan, usePersonalRecords } from '@/api/member';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Empty } from '@/components/ui/Empty';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/PageHeader';
import { fmtKg } from '@/lib/format';

export function WorkoutsPage() {
  const { data: plan, isLoading } = useMemberTrainingPlan();
  const { data: prs } = usePersonalRecords();

  return (
    <div>
      <PageHeader
        title="Your training"
        description={plan?.name ?? 'No active plan yet'}
      />

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : !plan || !plan.days || plan.days.length === 0 ? (
        <Empty
          title="No training plan yet"
          description="Your coach will assign one soon."
          icon={<Dumbbell className="h-5 w-5" />}
        />
      ) : (
        <div className="grid gap-3">
          {plan.days.map((d) => (
            <Link key={d.id} to={`/member/workouts/${d.id}`}>
              <Card className="flex items-center justify-between hover:ring-1 hover:ring-accent-400/40">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="display text-2xl text-accent-400">D{d.dayNumber}</span>
                    <span className="font-semibold">{d.name}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-ink-300">
                    {d.targetMuscles.length > 0 ? (
                      d.targetMuscles.map((m) => (
                        <Badge key={m} tone="muted" className="!normal-case">
                          {m}
                        </Badge>
                      ))
                    ) : (
                      <span>{d.exercises.length} exercises</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-ink-300" />
              </Card>
            </Link>
          ))}
        </div>
      )}

      {prs && prs.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Personal records</CardTitle>
          </CardHeader>
          <ul className="grid gap-2 sm:grid-cols-2">
            {prs.slice(0, 8).map((p) => (
              <li
                key={p.exerciseId}
                className="flex items-center justify-between rounded-xl bg-ink-800/40 px-3 py-2 text-sm"
              >
                <span className="truncate font-medium">{p.name}</span>
                <span className="font-semibold text-accent-300">{fmtKg(p.maxWeight)}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
