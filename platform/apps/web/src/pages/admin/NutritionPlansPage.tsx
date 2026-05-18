import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  useCreateNutritionPlan,
  useDeleteNutritionPlan,
  useNutritionPlans,
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

export function NutritionPlansPage() {
  const { data, isLoading } = useNutritionPlans();
  const remove = useDeleteNutritionPlan();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <PageHeader
        title="Nutrition Plans"
        description="Create macro-based plans, assign to members."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            New plan
          </Button>
        }
      />

      {isLoading || !data ? (
        <div className="grid gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <Empty
          title="No nutrition plans"
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
                  <Link to={`/admin/nutrition-plans/${p.id}`} className="font-medium hover:text-accent-300">
                    {p.name}
                  </Link>
                  <div className="text-xs text-ink-300">
                    {p.member ? `Assigned to ${p.member.fullName} · ` : 'Template · '}
                    {p.calories} kcal · {p.proteinG}P/{p.carbsG}C/{p.fatsG}F · Updated {fmtRelative(p.updatedAt)}
                  </div>
                </div>
                {p.isTemplate ? <Badge tone="muted">Template</Badge> : <Badge tone="success">Assigned</Badge>}
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

      <CreateModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const create = useCreateNutritionPlan();
  const { data: members } = useMembers({ pageSize: 100 });
  const [name, setName] = useState('');
  const [memberId, setMemberId] = useState('');
  const [calories, setCalories] = useState(2200);
  const [proteinG, setProteinG] = useState(150);
  const [carbsG, setCarbsG] = useState(220);
  const [fatsG, setFatsG] = useState(70);
  const [mealsPerDay, setMealsPerDay] = useState(4);

  function submit() {
    create.mutate(
      {
        name: name.trim(),
        memberId: memberId || null,
        isTemplate: !memberId,
        calories,
        proteinG,
        carbsG,
        fatsG,
        mealsPerDay,
        meals: Array.from({ length: mealsPerDay }).map((_, i) => ({
          order: i,
          name: `Meal ${i + 1}`,
          foods: [],
        })),
      },
      {
        onSuccess: (p) => {
          toast.success('Plan created');
          onClose();
          navigate(`/admin/nutrition-plans/${p.id}`);
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    );
  }
  return (
    <Modal open={open} onClose={onClose} title="New nutrition plan">
      <div className="grid gap-3">
        <Field label="Plan name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bulk plan A" />
        </Field>
        <Field label="Assign to (optional → template)">
          <Select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="">Template (no member)</option>
            {(members?.items ?? []).map((m) => (
              <option key={m.id} value={m.id}>{m.fullName}</option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Calories">
            <Input type="number" value={calories} onChange={(e) => setCalories(Number(e.target.value))} />
          </Field>
          <Field label="Protein (g)">
            <Input type="number" value={proteinG} onChange={(e) => setProteinG(Number(e.target.value))} />
          </Field>
          <Field label="Carbs (g)">
            <Input type="number" value={carbsG} onChange={(e) => setCarbsG(Number(e.target.value))} />
          </Field>
          <Field label="Fats (g)">
            <Input type="number" value={fatsG} onChange={(e) => setFatsG(Number(e.target.value))} />
          </Field>
        </div>
        <Field label="Meals per day">
          <Input type="number" min={1} max={10} value={mealsPerDay} onChange={(e) => setMealsPerDay(Number(e.target.value))} />
        </Field>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!name.trim()} loading={create.isPending}>
            Create
          </Button>
        </div>
      </div>
    </Modal>
  );
}
