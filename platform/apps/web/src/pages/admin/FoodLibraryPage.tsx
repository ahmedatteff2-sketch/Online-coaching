import { useState } from 'react';
import { Plus, Search, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { foodLibrary, useFoodLibrary } from '@/api/admin';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Empty } from '@/components/ui/Empty';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/PageHeader';
import { getApiErrorMessage } from '@/lib/apiError';
import type { FoodLibraryItem } from '@/api/types';

const empty = {
  name: '',
  servingSize: 100,
  unit: 'g',
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatsG: 0,
};

export function FoodLibraryPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useFoodLibrary(search);
  const remove = foodLibrary.useDelete();
  const create = foodLibrary.useCreate();
  const update = foodLibrary.useUpdate();

  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<FoodLibraryItem | null>(null);
  const [form, setForm] = useState(empty);

  function openEditModal(it: FoodLibraryItem) {
    setEditing(it);
    setForm({
      name: it.name,
      servingSize: it.servingSize,
      unit: it.unit,
      calories: it.calories,
      proteinG: it.proteinG,
      carbsG: it.carbsG,
      fatsG: it.fatsG,
    });
  }

  return (
    <div>
      <PageHeader
        title="Food Library"
        description="Reusable foods with macros."
        actions={
          <Button
            onClick={() => {
              setForm(empty);
              setOpenNew(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New food
          </Button>
        }
      />

      <Card>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <Input
            placeholder="Search foods..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {isLoading || !data ? (
          <div className="grid gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <Empty title="No foods yet" />
        ) : (
          <ul className="divide-y divide-ink-700/60">
            {data.map((f) => (
              <li key={f.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{f.name}</div>
                  <div className="text-xs text-ink-300">
                    Per {f.servingSize}{f.unit}: {f.calories} kcal · {f.proteinG}P/{f.carbsG}C/{f.fatsG}F
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => openEditModal(f)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (!confirm(`Delete "${f.name}"?`)) return;
                    remove.mutate(f.id, { onSuccess: () => toast.success('Deleted') });
                  }}
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={openNew || !!editing}
        onClose={() => {
          setOpenNew(false);
          setEditing(null);
        }}
        title={editing ? 'Edit food' : 'New food'}
      >
        <div className="grid gap-3">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Serving size">
              <Input
                type="number"
                value={form.servingSize}
                onChange={(e) => setForm({ ...form, servingSize: Number(e.target.value) })}
              />
            </Field>
            <Field label="Unit">
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Calories"><Input type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: Number(e.target.value) })} /></Field>
            <Field label="Protein (g)"><Input type="number" value={form.proteinG} onChange={(e) => setForm({ ...form, proteinG: Number(e.target.value) })} /></Field>
            <Field label="Carbs (g)"><Input type="number" value={form.carbsG} onChange={(e) => setForm({ ...form, carbsG: Number(e.target.value) })} /></Field>
            <Field label="Fats (g)"><Input type="number" value={form.fatsG} onChange={(e) => setForm({ ...form, fatsG: Number(e.target.value) })} /></Field>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setOpenNew(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button
              loading={create.isPending || update.isPending}
              disabled={!form.name}
              onClick={() => {
                if (editing) {
                  update.mutate(
                    { id: editing.id, body: form },
                    {
                      onSuccess: () => {
                        toast.success('Updated');
                        setEditing(null);
                      },
                      onError: (err) => toast.error(getApiErrorMessage(err)),
                    },
                  );
                } else {
                  create.mutate(form, {
                    onSuccess: () => {
                      toast.success('Food added');
                      setOpenNew(false);
                      setForm(empty);
                    },
                    onError: (err) => toast.error(getApiErrorMessage(err)),
                  });
                }
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
