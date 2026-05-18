import { useMemo } from 'react';
import { Check, X, MinusCircle } from 'lucide-react';
import { toast } from 'sonner';

import { useLogNutrition, useMemberNutritionPlan, useNutritionLogs } from '@/api/member';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Empty } from '@/components/ui/Empty';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/PageHeader';

const todayKey = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

export function NutritionPage() {
  const { data: plan, isLoading } = useMemberNutritionPlan();
  const { data: logs } = useNutritionLogs();
  const log = useLogNutrition();

  const todayMap = useMemo(() => {
    const m = new Map<string, 'COMPLETED' | 'SKIPPED' | 'PENDING'>();
    const t = todayKey();
    (logs ?? []).forEach((l) => {
      if (l.mealId && l.date.slice(0, 10) === t) m.set(l.mealId, l.status);
    });
    return m;
  }, [logs]);

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Nutrition" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div>
        <PageHeader title="Nutrition" />
        <Empty title="No nutrition plan yet" description="Your coach will assign one soon." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Nutrition" description={plan.name} />

      <Card className="mb-4">
        <div className="grid grid-cols-4 gap-2 text-center">
          <Macro label="Calories" value={plan.calories} unit="kcal" />
          <Macro label="Protein" value={plan.proteinG} unit="g" />
          <Macro label="Carbs" value={plan.carbsG} unit="g" />
          <Macro label="Fats" value={plan.fatsG} unit="g" />
        </div>
      </Card>

      <div className="grid gap-3">
        {(plan.meals ?? []).map((m) => {
          const status = todayMap.get(m.id) ?? 'PENDING';
          const totals = m.foods.reduce(
            (acc, f) => ({
              cal: acc.cal + f.calories,
              p: acc.p + f.proteinG,
              c: acc.c + f.carbsG,
              f: acc.f + f.fatsG,
            }),
            { cal: 0, p: 0, c: 0, f: 0 },
          );
          return (
            <Card key={m.id}>
              <CardHeader>
                <div>
                  <CardTitle>{m.name}</CardTitle>
                  {m.time ? <p className="text-xs text-ink-300">{m.time}</p> : null}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={status === 'COMPLETED' ? 'primary' : 'secondary'}
                    onClick={() =>
                      log.mutate(
                        { mealId: m.id, status: 'COMPLETED', percentFollowed: 100 },
                        { onSuccess: () => toast.success('Marked done') },
                      )
                    }
                  >
                    <Check className="h-4 w-4" />
                    Done
                  </Button>
                  <Button
                    size="sm"
                    variant={status === 'SKIPPED' ? 'danger' : 'secondary'}
                    onClick={() =>
                      log.mutate(
                        { mealId: m.id, status: 'SKIPPED' },
                        { onSuccess: () => toast.success('Marked skipped') },
                      )
                    }
                  >
                    <X className="h-4 w-4" />
                    Skip
                  </Button>
                </div>
              </CardHeader>

              {m.foods.length === 0 ? (
                <Empty title="No foods listed" icon={<MinusCircle className="h-5 w-5" />} className="!py-6" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-xs uppercase tracking-wider text-ink-300">
                      <tr>
                        <th className="py-2">Food</th>
                        <th className="py-2 text-right">Qty</th>
                        <th className="py-2 text-right">kcal</th>
                        <th className="py-2 text-right">P</th>
                        <th className="py-2 text-right">C</th>
                        <th className="py-2 text-right">F</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-700/60">
                      {m.foods.map((f) => (
                        <tr key={f.id}>
                          <td className="py-2">{f.name}</td>
                          <td className="py-2 text-right">{f.quantity} {f.unit}</td>
                          <td className="py-2 text-right">{f.calories.toFixed(0)}</td>
                          <td className="py-2 text-right">{f.proteinG.toFixed(0)}</td>
                          <td className="py-2 text-right">{f.carbsG.toFixed(0)}</td>
                          <td className="py-2 text-right">{f.fatsG.toFixed(0)}</td>
                        </tr>
                      ))}
                      <tr className="font-semibold text-accent-300">
                        <td className="py-2">Total</td>
                        <td />
                        <td className="py-2 text-right">{totals.cal.toFixed(0)}</td>
                        <td className="py-2 text-right">{totals.p.toFixed(0)}</td>
                        <td className="py-2 text-right">{totals.c.toFixed(0)}</td>
                        <td className="py-2 text-right">{totals.f.toFixed(0)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Macro({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div>
      <div className="display text-3xl">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-ink-300">
        {label} ({unit})
      </div>
    </div>
  );
}
