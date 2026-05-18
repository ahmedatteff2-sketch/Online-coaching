import { useState } from 'react';
import { toast } from 'sonner';
import { Save } from 'lucide-react';

import { useCheckIns, useSubmitCheckIn } from '@/api/member';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Textarea } from '@/components/ui/Input';
import { Empty } from '@/components/ui/Empty';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/PageHeader';
import { fmtDate } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/apiError';

const RATINGS = [
  { key: 'energy', label: 'Energy' },
  { key: 'sleep', label: 'Sleep' },
  { key: 'hunger', label: 'Hunger' },
  { key: 'stress', label: 'Stress' },
  { key: 'workoutScore', label: 'Workout' },
  { key: 'nutritionScore', label: 'Nutrition' },
  { key: 'mood', label: 'Mood' },
] as const;

export function CheckInPage() {
  const { data: history = [] } = useCheckIns();
  const submit = useSubmitCheckIn();
  const [scores, setScores] = useState<Record<string, number | null>>({});
  const [notes, setNotes] = useState('');
  const [issues, setIssues] = useState('');

  function rate(key: string, val: number) {
    setScores((s) => ({ ...s, [key]: val }));
  }

  function send() {
    const body: Record<string, unknown> = {
      ...scores,
      notes: notes || null,
      issues: issues || null,
    };
    submit.mutate(body as never, {
      onSuccess: () => {
        toast.success('Check-in submitted');
        setScores({});
        setNotes('');
        setIssues('');
      },
      onError: (err) => toast.error(getApiErrorMessage(err)),
    });
  }

  return (
    <div>
      <PageHeader title="Weekly check-in" description="Rate your week so your coach can adjust the plan." />

      <Card className="mb-4">
        <div className="grid gap-4">
          {RATINGS.map((r) => (
            <div key={r.key} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">{r.label}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = scores[r.key] === n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => rate(r.key, n)}
                      className={`h-9 w-9 rounded-lg border text-sm font-semibold transition-colors ${
                        active
                          ? 'border-accent-400 bg-accent-400 text-ink-950'
                          : 'border-ink-700 bg-ink-800 text-ink-200 hover:bg-ink-700'
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <Field label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </Field>
          <Field label="Issues this week">
            <Textarea value={issues} onChange={(e) => setIssues(e.target.value)} rows={2} />
          </Field>
          <div className="text-right">
            <Button onClick={send} loading={submit.isPending}>
              <Save className="h-4 w-4" />
              Submit check-in
            </Button>
          </div>
        </div>
      </Card>

      <h2 className="mb-2 text-base font-semibold">History</h2>
      {history.length === 0 ? (
        <Empty title="No check-ins yet" />
      ) : (
        <div className="grid gap-3">
          {history.map((c) => (
            <Card key={c.id}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Week of {fmtDate(c.weekStart)}</span>
                {c.adminFeedback ? <Badge tone="success">Coach feedback</Badge> : null}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-ink-200 sm:grid-cols-4">
                {RATINGS.map((r) => (
                  <span key={r.key}>
                    {r.label}: {(c as Record<string, unknown>)[r.key] != null ? String((c as Record<string, unknown>)[r.key]) : '—'}
                  </span>
                ))}
              </div>
              {c.notes ? <p className="mt-2 text-sm">{c.notes}</p> : null}
              {c.adminFeedback ? (
                <div className="mt-3 rounded-lg border border-accent-700/40 bg-accent-900/10 p-3 text-sm">
                  <div className="mb-1 text-xs uppercase tracking-wider text-accent-300">Coach</div>
                  <p>{c.adminFeedback}</p>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
