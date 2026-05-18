import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Copy, Trash2, ListPlus } from 'lucide-react';
import { toast } from 'sonner';

import {
  useCreateTrainingPlan,
  useDeleteTrainingPlan,
  useDuplicateTrainingPlan,
  useTrainingPlans,
  useMembers,
} from '@/api/admin';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Empty } from '@/components/ui/Empty';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { Field, Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/PageHeader';
import { fmtRelative } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/apiError';

export function TrainingPlansPage() {
  const [filter, setFilter] = useState<'all' | 'templates' | 'assigned'>('all');
  const params = filter === 'templates' ? { template: 'true' as const } : filter === 'assigned' ? { template: 'false' as const } : {};
  const { data, isLoading } = useTrainingPlans(params);
  const remove = useDeleteTrainingPlan();
  const duplicate = useDuplicateTrainingPlan();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Training Plans"
        description="Build, duplicate, and assign training plans."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            New plan
          </Button>
        }
      />

      <div className="mb-4 inline-flex rounded-xl border border-ink-700/60 bg-ink-900/50 p-1">
        {(['all', 'templates', 'assigned'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize ${
              filter === t ? 'bg-accent-400 text-ink-950' : 'text-ink-200 hover:text-ink-100'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading || !data ? (
        <div className="grid gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <Empty
          title="No training plans"
          description="Create your first plan or template."
          action={<Button onClick={() => setOpen(true)}>Create plan</Button>}
        />
      ) : (
        <Card className="!p-0">
          <ul className="divide-y divide-ink-700/60">
            {data.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-ink-800/40"
              >
                <div className="min-w-0 flex-1">
                  <Link to={`/admin/training-plans/${p.id}`} className="font-medium hover:text-accent-300">
                    {p.name}
                  </Link>
                  <div className="text-xs text-ink-300">
                    {p.member ? `Assigned to ${p.member.fullName} · ` : 'Template · '}
                    {p.daysPerWeek} days/week · Updated {fmtRelative(p.updatedAt)}
                  </div>
                </div>
                {p.isTemplate ? <Badge tone="muted">Template</Badge> : <Badge tone="success">Assigned</Badge>}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    duplicate.mutate(p.id, {
                      onSuccess: () => toast.success('Duplicated as template'),
                    })
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (!confirm(`Delete "${p.name}"?`)) return;
                    remove.mutate(p.id, { onSuccess: () => toast.success('Deleted') });
                  }}
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <CreatePlanModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function CreatePlanModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [memberId, setMemberId] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [goal, setGoal] = useState('');
  const create = useCreateTrainingPlan();
  const { data: members } = useMembers({ pageSize: 100 });

  function submit() {
    create.mutate(
      {
        name: name.trim(),
        memberId: memberId || null,
        isTemplate: !memberId,
        daysPerWeek,
        goal: goal || null,
        days: Array.from({ length: daysPerWeek }).map((_, i) => ({
          dayNumber: i + 1,
          name: `Day ${i + 1}`,
          targetMuscles: [],
          exercises: [],
        })),
      },
      {
        onSuccess: (p) => {
          toast.success('Plan created');
          onClose();
          navigate(`/admin/training-plans/${p.id}`);
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  }
  return (
    <Modal open={open} onClose={onClose} title="New training plan">
      <div className="grid gap-3">
        <Field label="Plan name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Push / Pull / Legs" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Assign to (optional → template)">
            <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
              <option value="">Template (no member)</option>
              {(members?.items ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Days per week">
            <Select value={daysPerWeek} onChange={(e) => setDaysPerWeek(Number(e.target.value))}>
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Goal (optional)">
          <Select value={goal} onChange={(e) => setGoal(e.target.value)}>
            <option value="">—</option>
            <option value="MUSCLE_GAIN">Muscle gain</option>
            <option value="FAT_LOSS">Fat loss</option>
            <option value="STRENGTH">Strength</option>
            <option value="ENDURANCE">Endurance</option>
            <option value="GENERAL_FITNESS">General fitness</option>
          </Select>
        </Field>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!name.trim()} loading={create.isPending}>
            <ListPlus className="h-4 w-4" />
            Create
          </Button>
        </div>
      </div>
    </Modal>
  );
}
