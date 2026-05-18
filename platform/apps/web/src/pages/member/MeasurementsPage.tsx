import { useState } from 'react';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

import { useAddMeasurement, useMeasurements } from '@/api/member';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Input';
import { PageHeader } from '@/components/PageHeader';
import { LineChartCard } from '@/components/charts/LineChartCard';
import { getApiErrorMessage } from '@/lib/apiError';
import type { BodyMeasurementRow } from '@/api/types';

const FIELDS: (keyof BodyMeasurementRow)[] = [
  'chest',
  'waist',
  'hip',
  'thigh',
  'calf',
  'biceps',
  'forearm',
  'shoulder',
  'neck',
  'bodyFatPct',
];

export function MeasurementsPage() {
  const { data: items = [] } = useMeasurements();
  const add = useAddMeasurement();
  const [form, setForm] = useState<Record<string, string>>({});

  function update(field: string, val: string) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  function submit() {
    const body: Partial<BodyMeasurementRow> = {};
    let any = false;
    for (const k of FIELDS) {
      const v = form[k];
      if (v !== undefined && v !== '') {
        (body as Record<string, number>)[k] = Number(v);
        any = true;
      }
    }
    if (!any) return toast.error('Enter at least one measurement');
    add.mutate(body as never, {
      onSuccess: () => {
        toast.success('Measurements saved');
        setForm({});
      },
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  }

  return (
    <div>
      <PageHeader title="Body measurements" description="Track every inch you change." />

      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-5">
          {FIELDS.map((k) => (
            <Field key={k} label={k === 'bodyFatPct' ? 'Body fat %' : k.charAt(0).toUpperCase() + k.slice(1)}>
              <Input
                inputMode="decimal"
                value={form[k] ?? ''}
                onChange={(e) => update(k as string, e.target.value)}
                placeholder={k === 'bodyFatPct' ? '%' : 'cm'}
              />
            </Field>
          ))}
        </div>
        <div className="mt-3 text-right">
          <Button onClick={submit} loading={add.isPending}>
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {(['chest', 'waist', 'hip', 'thigh', 'biceps', 'shoulder', 'bodyFatPct'] as const).map((field) => (
          <LineChartCard
            key={field}
            title={field === 'bodyFatPct' ? 'Body fat %' : field.charAt(0).toUpperCase() + field.slice(1)}
            unit={field === 'bodyFatPct' ? ' %' : ' cm'}
            data={items.map((m) => ({ date: m.date, value: (m[field] as number | null) ?? null }))}
          />
        ))}
      </div>
    </div>
  );
}
