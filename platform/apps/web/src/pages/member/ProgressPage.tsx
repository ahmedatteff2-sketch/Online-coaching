import { useMemo, useState } from 'react';
import { useMeasurements, usePhotos, useWeights } from '@/api/member';
import { Card } from '@/components/ui/Card';
import { Field, Select } from '@/components/ui/Input';
import { Empty } from '@/components/ui/Empty';
import { PageHeader } from '@/components/PageHeader';
import { fmtDate } from '@/lib/format';

export function ProgressPage() {
  const { data: photos = [] } = usePhotos();
  const { data: weights = [] } = useWeights();
  const { data: measurements = [] } = useMeasurements();

  const photosByType = useMemo(() => {
    const map = { FRONT: [] as typeof photos, SIDE: [] as typeof photos, BACK: [] as typeof photos };
    photos.forEach((p) => {
      if (p.type === 'FRONT' || p.type === 'SIDE' || p.type === 'BACK') map[p.type].push(p);
    });
    return map;
  }, [photos]);

  const dates = Array.from(new Set(photos.map((p) => p.date.slice(0, 10)))).sort();
  const [from, setFrom] = useState<string>(dates[0] ?? '');
  const [to, setTo] = useState<string>(dates[dates.length - 1] ?? '');

  function nearestWeight(date: string) {
    const target = new Date(date).getTime();
    return weights.reduce((best: typeof weights[number] | null, w) => {
      const dt = Math.abs(new Date(w.date).getTime() - target);
      return !best || dt < Math.abs(new Date(best.date).getTime() - target) ? w : best;
    }, null);
  }

  function nearestMeasurement(date: string) {
    const target = new Date(date).getTime();
    return measurements.reduce((best: typeof measurements[number] | null, m) => {
      const dt = Math.abs(new Date(m.date).getTime() - target);
      return !best || dt < Math.abs(new Date(best.date).getTime() - target) ? m : best;
    }, null);
  }

  if (dates.length < 2) {
    return (
      <div>
        <PageHeader title="Progress" description="Compare any two dates." />
        <Empty
          title="Not enough photos to compare"
          description="Upload at least two weekly photos to see comparisons."
        />
      </div>
    );
  }

  const wA = from ? nearestWeight(from) : null;
  const wB = to ? nearestWeight(to) : null;
  const mA = from ? nearestMeasurement(from) : null;
  const mB = to ? nearestMeasurement(to) : null;

  return (
    <div>
      <PageHeader title="Progress comparison" description="Pick two dates to compare." />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="From">
            <Select value={from} onChange={(e) => setFrom(e.target.value)}>
              {dates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="To">
            <Select value={to} onChange={(e) => setTo(e.target.value)}>
              {dates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {(['FRONT', 'SIDE', 'BACK'] as const).map((t) => {
          const a = photosByType[t].find((p) => p.date.slice(0, 10) === from);
          const b = photosByType[t].find((p) => p.date.slice(0, 10) === to);
          return (
            <Card key={t}>
              <h3 className="mb-3 text-sm font-semibold">{t}</h3>
              <div className="grid grid-cols-2 gap-2">
                <SidePhoto label={fmtDate(from)} url={a?.url} />
                <SidePhoto label={fmtDate(to)} url={b?.url} />
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4">
        <h3 className="mb-3 text-sm font-semibold">Numbers comparison</h3>
        <div className="grid gap-2 text-sm">
          <DiffRow label="Weight" a={wA?.weightKg ?? null} b={wB?.weightKg ?? null} unit="kg" />
          <DiffRow label="Waist" a={mA?.waist ?? null} b={mB?.waist ?? null} unit="cm" />
          <DiffRow label="Chest" a={mA?.chest ?? null} b={mB?.chest ?? null} unit="cm" />
          <DiffRow label="Hip" a={mA?.hip ?? null} b={mB?.hip ?? null} unit="cm" />
          <DiffRow label="Thigh" a={mA?.thigh ?? null} b={mB?.thigh ?? null} unit="cm" />
          <DiffRow label="Body fat" a={mA?.bodyFatPct ?? null} b={mB?.bodyFatPct ?? null} unit="%" />
        </div>
      </Card>
    </div>
  );
}

function SidePhoto({ label, url }: { label: string; url?: string }) {
  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-ink-700">
        {url ? (
          <img src={url} alt="" className="aspect-[3/4] w-full object-cover" />
        ) : (
          <div className="grid aspect-[3/4] place-items-center bg-ink-800 text-xs text-ink-300">No photo</div>
        )}
      </div>
      <div className="mt-1 text-center text-xs text-ink-300">{label}</div>
    </div>
  );
}

function DiffRow({
  label,
  a,
  b,
  unit,
}: {
  label: string;
  a: number | null;
  b: number | null;
  unit: string;
}) {
  const diff = a != null && b != null ? b - a : null;
  return (
    <div className="grid grid-cols-4 items-center">
      <span className="text-ink-200">{label}</span>
      <span className="text-right">{a != null ? `${a.toFixed(1)} ${unit}` : '—'}</span>
      <span className="text-right">{b != null ? `${b.toFixed(1)} ${unit}` : '—'}</span>
      <span
        className={`text-right font-semibold ${
          diff == null ? 'text-ink-300' : diff < 0 ? 'text-accent-300' : diff > 0 ? 'text-warn' : ''
        }`}
      >
        {diff == null ? '—' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)} ${unit}`}
      </span>
    </div>
  );
}
