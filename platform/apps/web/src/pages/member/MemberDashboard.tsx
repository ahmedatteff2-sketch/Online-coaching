import { Link } from 'react-router-dom';
import { Dumbbell, Scale, Utensils, MessageCircle } from 'lucide-react';
import { useMemberOverviewSelf, useNotifications, useReadAllNotifications } from '@/api/member';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Stat';
import { Skeleton } from '@/components/ui/Skeleton';
import { Empty } from '@/components/ui/Empty';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/PageHeader';
import { fmtKg, fmtPercent, fmtRelative } from '@/lib/format';

export function MemberDashboard() {
  const { data, isLoading } = useMemberOverviewSelf();
  const { data: notifs } = useNotifications();
  const readAll = useReadAllNotifications();

  if (isLoading || !data) {
    return (
      <div>
        <PageHeader title="Loading..." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const me = data.me;
  const profile = me?.memberProfile;
  const goal = profile?.goal?.replace(/_/g, ' ').toLowerCase();
  const unread = (notifs ?? []).filter((n) => !n.readAt);

  return (
    <div>
      <PageHeader
        title={`Hey, ${me?.fullName.split(' ')[0] ?? 'there'}`}
        description={goal ? `Goal: ${goal}` : 'Welcome back'}
        actions={
          unread.length > 0 ? (
            <Button size="sm" variant="secondary" onClick={() => readAll.mutate()}>
              Mark all read ({unread.length})
            </Button>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          label="Current weight"
          value={fmtKg(profile?.currentWeightKg)}
          hint={data.latestWeight ? `Last logged ${fmtRelative(data.latestWeight.date)}` : 'Add your first weight'}
          icon={<Scale className="h-5 w-5" />}
        />
        <Stat
          label="Workout adherence"
          value={fmtPercent(data.adherence.workoutAdherence ?? 0)}
          hint="This week"
          icon={<Dumbbell className="h-5 w-5" />}
        />
        <Stat
          label="Nutrition adherence"
          value={fmtPercent(data.adherence.nutritionAdherence ?? 0)}
          hint="This week"
          icon={<Utensils className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today's training</CardTitle>
            <Link to="/member/workouts">
              <Button size="sm" variant="secondary">Open</Button>
            </Link>
          </CardHeader>
          {data.plan && data.plan.days && data.plan.days.length > 0 ? (
            <ul className="grid gap-2">
              {data.plan.days.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-xl bg-ink-800/40 px-3 py-2"
                >
                  <Link
                    to={`/member/workouts/${d.id}`}
                    className="text-sm font-medium hover:text-accent-300"
                  >
                    {d.name}
                  </Link>
                  <Badge tone="muted">{d.exercises.length} exercises</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <Empty title="No training plan yet" description="Your coach will assign one soon." />
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's meals</CardTitle>
            <Link to="/member/nutrition">
              <Button size="sm" variant="secondary">Open</Button>
            </Link>
          </CardHeader>
          {data.nutrition && data.nutrition.meals && data.nutrition.meals.length > 0 ? (
            <div>
              <div className="mb-3 grid grid-cols-4 gap-2 text-center text-xs">
                <Macro label="kcal" value={data.nutrition.calories} />
                <Macro label="P" value={data.nutrition.proteinG} />
                <Macro label="C" value={data.nutrition.carbsG} />
                <Macro label="F" value={data.nutrition.fatsG} />
              </div>
              <ul className="grid gap-2">
                {data.nutrition.meals.slice(0, 4).map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between rounded-xl bg-ink-800/40 px-3 py-2"
                  >
                    <span className="text-sm font-medium">{m.name}</span>
                    {m.time ? <span className="text-xs text-ink-300">{m.time}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <Empty title="No nutrition plan yet" description="Your coach will assign one soon." />
          )}
        </Card>

        {data.latestNote ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-accent-300" /> Latest note from coach
              </CardTitle>
              <span className="text-xs text-ink-300">{fmtRelative(data.latestNote.createdAt)}</span>
            </CardHeader>
            <p className="whitespace-pre-wrap text-sm text-ink-100">{data.latestNote.body}</p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function Macro({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-ink-800/60 py-2">
      <div className="display text-lg leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-ink-300">{label}</div>
    </div>
  );
}
