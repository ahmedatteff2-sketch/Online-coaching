import { useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

import { useAddWeight, useWeights } from '@/api/member';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/PageHeader';
import { LineChartCard } from '@/components/charts/LineChartCard';
import { fmtDate, fmtKg } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/apiError';

export function WeightPage() {
  const { data: weights = [] } = useWeights();
  const add = useAddWeight();
  const [value, setValue] = useState('');

  const last = weights[weights.length - 1];
  const first = weights[0];
  const weekAgo = new Date(Date.now() - 7 * 86400_000);
  const lastWeek = weights.filter((w) => new Date(w.date) >= weekAgo);
  const weeklyAvg =
    lastWeek.length === 0 ? null : lastWeek.reduce((a, w) => a + w.weightKg, 0) / lastWeek.length;
  const fromLastWeek = last && lastWeek[0] ? last.weightKg - lastWeek[0].weightKg : null;
  const fromStart = last && first ? last.weightKg - first.weightKg : null;

  function submit() {
    const n = Number(value);
    if (!n || Number.isNaN(n)) return;
    add.mutate(
      { weightKg: n },
      {
        onSuccess: () => {
          setValue('');
          toast.success('Weight saved');
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  }

  return (
    <div>
      <PageHeader title="Weight" description="Log daily, watch the trend." />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Today's weight (kg)">
            <Input
              inputMode="decimal"
              placeholder="84.6"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </Field>
          <div className="flex items-end">
            <Button onClick={submit} loading={add.isPending} disabled={!value}>
              <Plus className="h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </Card>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <KPI label="Latest" value={fmtKg(last?.weightKg)} hint={last ? fmtDate(last.date) : '—'} />
        <KPI
          label="Weekly avg"
          value={weeklyAvg == null ? '—' : `${weeklyAvg.toFixed(1)} kg`}
          hint={lastWeek.length ? `${lastWeek.length} entries` : 'No entries'}
        />
        <KPI
          label="Δ from start"
          value={fromStart == null ? '—' : `${fromStart > 0 ? '+' : ''}${fromStart.toFixed(1)} kg`}
          hint={fromLastWeek != null ? `${fromLastWeek > 0 ? '+' : ''}${fromLastWeek.toFixed(1)} kg this week` : ''}
        />
      </div>

      <LineChartCard
        title="Weight trend"
        unit=" kg"
        data={weights.map((w) => ({ date: w.date, value: w.weightKg }))}
      />

      <Card className="mt-4 !p-0">
        <ul className="divide-y divide-ink-700/60">
          {weights
            .slice()
            .reverse()
            .slice(0, 30)
            .map((w) => (
              <li key={w.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>{fmtDate(w.date)}</span>
                <span className="font-semibold">{fmtKg(w.weightKg)}</span>
              </li>
            ))}
        </ul>
      </Card>
    </div>
  );
}

function KPI({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <div className="label-faded">{label}</div>
      <div className="display mt-1 text-3xl">{value}</div>
      {hint ? <div className="text-xs text-ink-300">{hint}</div> : null}
    </Card>
  );
}
