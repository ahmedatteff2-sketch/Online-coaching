import { useState } from 'react';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';

import { useAddMyNote, useCoachNotes, useMyNotes } from '@/api/member';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Textarea } from '@/components/ui/Input';
import { Empty } from '@/components/ui/Empty';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/PageHeader';
import { fmtRelative } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/apiError';

export function NotesPage() {
  const { data: coachNotes = [] } = useCoachNotes();
  const { data: myNotes = [] } = useMyNotes();
  const add = useAddMyNote();
  const [body, setBody] = useState('');

  function send() {
    if (!body.trim()) return;
    add.mutate(
      { body },
      {
        onSuccess: () => {
          setBody('');
          toast.success('Saved');
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  }

  return (
    <div>
      <PageHeader title="Notes" description="From your coach + your own log." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-base font-semibold">From your coach</h3>
          {coachNotes.length === 0 ? (
            <Empty title="No coach notes yet" />
          ) : (
            <ul className="grid gap-3">
              {coachNotes.map((n) => (
                <li key={n.id} className="rounded-xl bg-ink-800/40 p-3">
                  <div className="flex items-center justify-between text-xs text-ink-300">
                    <Badge tone="muted">{n.kind.replace(/_/g, ' ').toLowerCase()}</Badge>
                    <span>{fmtRelative(n.createdAt)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="mb-3 text-base font-semibold">Your notes</h3>
          <Field label="Add a note">
            <Textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Felt strong today, sleep was poor..."
            />
          </Field>
          <div className="mt-2 text-right">
            <Button onClick={send} loading={add.isPending} disabled={!body.trim()}>
              <Plus className="h-4 w-4" />
              Add note
            </Button>
          </div>
          {myNotes.length === 0 ? (
            <Empty title="No personal notes yet" className="mt-4" />
          ) : (
            <ul className="mt-4 grid gap-3">
              {myNotes.map((n) => (
                <li key={n.id} className="rounded-xl bg-ink-800/40 p-3">
                  <div className="text-xs text-ink-300">{fmtRelative(n.createdAt)}</div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
