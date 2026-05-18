import { useEffect, useState } from 'react';
import { Plus, Search, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { exerciseLibrary, useExerciseLibrary } from '@/api/admin';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Empty } from '@/components/ui/Empty';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/PageHeader';
import { getApiErrorMessage } from '@/lib/apiError';
import type { ExerciseLibraryItem } from '@/api/types';

export function ExerciseLibraryPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useExerciseLibrary(search);
  const remove = exerciseLibrary.useDelete();
  const [editing, setEditing] = useState<ExerciseLibraryItem | null>(null);
  const [openNew, setOpenNew] = useState(false);

  return (
    <div>
      <PageHeader
        title="Exercise Library"
        description="Reusable exercises with default sets/reps."
        actions={
          <Button onClick={() => setOpenNew(true)}>
            <Plus className="h-4 w-4" />
            New exercise
          </Button>
        }
      />

      <Card>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
          <Input
            placeholder="Search exercises..."
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
          <Empty title="No exercises" />
        ) : (
          <ul className="divide-y divide-ink-700/60">
            {data.map((ex) => (
              <li key={ex.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{ex.name}</div>
                  <div className="text-xs text-ink-300">
                    {ex.muscleGroup} · {ex.defaultSets}×{ex.defaultRepsMin}-{ex.defaultRepsMax} ·{' '}
                    {ex.defaultRestSeconds}s rest
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setEditing(ex)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (!confirm(`Delete "${ex.name}"?`)) return;
                    remove.mutate(ex.id, { onSuccess: () => toast.success('Deleted') });
                  }}
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <NewModal open={openNew} onClose={() => setOpenNew(false)} />
      <EditModal item={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

const emptyEx = {
  name: '',
  muscleGroup: '',
  videoUrl: '',
  imageUrl: '',
  instructions: '',
  defaultSets: 3,
  defaultRepsMin: 8,
  defaultRepsMax: 12,
  defaultRestSeconds: 90,
};

function NewModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = exerciseLibrary.useCreate();
  const [v, setV] = useState(emptyEx);
  return (
    <Modal open={open} onClose={onClose} title="New exercise">
      <ExerciseForm value={v} onChange={setV} />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          loading={create.isPending}
          onClick={() =>
            create.mutate(v, {
              onSuccess: () => {
                toast.success('Exercise added');
                setV(emptyEx);
                onClose();
              },
              onError: (err) => toast.error(getApiErrorMessage(err)),
            })
          }
          disabled={!v.name || !v.muscleGroup}
        >
          Save
        </Button>
      </div>
    </Modal>
  );
}

function EditModal({
  item,
  onClose,
}: {
  item: ExerciseLibraryItem | null;
  onClose: () => void;
}) {
  const update = exerciseLibrary.useUpdate();
  const [v, setV] = useState(emptyEx);
  useEffect(() => {
    if (item) {
      setV({
        name: item.name,
        muscleGroup: item.muscleGroup,
        videoUrl: item.videoUrl ?? '',
        imageUrl: item.imageUrl ?? '',
        instructions: item.instructions ?? '',
        defaultSets: item.defaultSets,
        defaultRepsMin: item.defaultRepsMin,
        defaultRepsMax: item.defaultRepsMax,
        defaultRestSeconds: item.defaultRestSeconds,
      });
    }
  }, [item]);
  return (
    <Modal open={!!item} onClose={() => { setV(emptyEx); onClose(); }} title="Edit exercise">
      <ExerciseForm value={v} onChange={setV} />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => { setV(emptyEx); onClose(); }}>Cancel</Button>
        <Button
          loading={update.isPending}
          onClick={() =>
            item &&
            update.mutate(
              { id: item.id, body: v },
              {
                onSuccess: () => {
                  toast.success('Updated');
                  setV(emptyEx);
                  onClose();
                },
                onError: (err) => toast.error(getApiErrorMessage(err)),
              },
            )
          }
        >
          Save
        </Button>
      </div>
    </Modal>
  );
}

function ExerciseForm({
  value,
  onChange,
}: {
  value: typeof emptyEx;
  onChange: (v: typeof emptyEx) => void;
}) {
  const set = (patch: Partial<typeof emptyEx>) => onChange({ ...value, ...patch });
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <Input value={value.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Muscle group">
          <Input value={value.muscleGroup} onChange={(e) => set({ muscleGroup: e.target.value })} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="Sets"><Input type="number" value={value.defaultSets} onChange={(e) => set({ defaultSets: Number(e.target.value) })} /></Field>
        <Field label="Reps min"><Input type="number" value={value.defaultRepsMin} onChange={(e) => set({ defaultRepsMin: Number(e.target.value) })} /></Field>
        <Field label="Reps max"><Input type="number" value={value.defaultRepsMax} onChange={(e) => set({ defaultRepsMax: Number(e.target.value) })} /></Field>
        <Field label="Rest (sec)"><Input type="number" value={value.defaultRestSeconds} onChange={(e) => set({ defaultRestSeconds: Number(e.target.value) })} /></Field>
      </div>
      <Field label="Video URL">
        <Input value={value.videoUrl} onChange={(e) => set({ videoUrl: e.target.value })} placeholder="https://..." />
      </Field>
      <Field label="Instructions">
        <Textarea rows={3} value={value.instructions} onChange={(e) => set({ instructions: e.target.value })} />
      </Field>
    </div>
  );
}
