import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, KeyRound, Save, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import {
  useAdminNotes,
  useCreateAdminNote,
  useDeleteAdminNote,
  useDeleteMember,
  useMemberOverview,
  useResetMemberPassword,
  useSetMemberStatus,
  useUpdateMember,
} from '@/api/admin';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Empty } from '@/components/ui/Empty';
import { PageHeader } from '@/components/PageHeader';
import { LineChartCard } from '@/components/charts/LineChartCard';
import { fmtDate, fmtKg, fmtRelative } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/apiError';
import type { MemberStatus } from '@/api/types';

const statusTone: Record<MemberStatus, 'success' | 'warn' | 'danger'> = {
  ACTIVE: 'success',
  INACTIVE: 'warn',
  EXPIRED: 'danger',
};

type Tab = 'overview' | 'progress' | 'photos' | 'notes';

export function MemberDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data, isLoading } = useMemberOverview(id);
  const { data: notes } = useAdminNotes(id);

  const [tab, setTab] = useState<Tab>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  const update = useUpdateMember();
  const setStatus = useSetMemberStatus();
  const resetPw = useResetMemberPassword();
  const remove = useDeleteMember();
  const createNote = useCreateAdminNote();
  const deleteNote = useDeleteAdminNote();

  if (isLoading || !data) {
    return (
      <div>
        <PageHeader title="Member" />
        <div className="grid h-32 place-items-center text-ink-200">Loading...</div>
      </div>
    );
  }

  const m = data.member;
  const profile = m.memberProfile;

  return (
    <div>
      <PageHeader
        title={m.fullName}
        description={m.phone}
        actions={
          <>
            <Link to="/admin/members">
              <Button variant="ghost">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <Button variant="secondary" onClick={() => setPwOpen(true)}>
              <KeyRound className="h-4 w-4" />
              Reset password
            </Button>
            <Button onClick={() => setEditOpen(true)}>Edit profile</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!confirm(`Delete ${m.fullName}?`)) return;
                remove.mutate(m.id, {
                  onSuccess: () => {
                    toast.success('Member deleted');
                    history.back();
                  },
                });
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            {m.profileImage ? (
              <img src={m.profileImage} alt="" className="h-14 w-14 rounded-full object-cover" />
            ) : (
              <span className="grid h-14 w-14 place-items-center rounded-full bg-ink-700 text-xl font-bold">
                {m.fullName.slice(0, 1)}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <Badge tone={statusTone[profile?.status ?? 'ACTIVE']}>
                {profile?.status ?? 'ACTIVE'}
              </Badge>
              <div className="mt-1 text-xs text-ink-300">Joined {fmtDate(m.createdAt)}</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-ink-300">Goal</span>
            <span className="text-right">{profile?.goal?.replace(/_/g, ' ').toLowerCase() ?? '—'}</span>
            <span className="text-ink-300">Level</span>
            <span className="text-right">{profile?.fitnessLevel?.toLowerCase() ?? '—'}</span>
            <span className="text-ink-300">Height</span>
            <span className="text-right">{profile?.heightCm ? `${profile.heightCm} cm` : '—'}</span>
            <span className="text-ink-300">Weight</span>
            <span className="text-right">{fmtKg(profile?.currentWeightKg)}</span>
          </div>
        </Card>
        <Card>
          <Field label="Status">
            <Select
              defaultValue={profile?.status ?? 'ACTIVE'}
              onChange={(e) => {
                setStatus.mutate(
                  { id: m.id, status: e.target.value as MemberStatus },
                  {
                    onSuccess: () => toast.success('Status updated'),
                    onError: (err) => toast.error(getApiErrorMessage(err)),
                  },
                );
              }}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="EXPIRED">Expired</option>
            </Select>
          </Field>
        </Card>
      </div>

      {/* Tabs */}
      <div className="mb-4 inline-flex rounded-xl border border-ink-700/60 bg-ink-900/50 p-1">
        {(['overview', 'progress', 'photos', 'notes'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm capitalize ${
              tab === t ? 'bg-accent-400 text-ink-950' : 'text-ink-200 hover:text-ink-100'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Active training plan</CardTitle>
              <Link to="/admin/training-plans">
                <Button size="sm" variant="secondary">Manage</Button>
              </Link>
            </CardHeader>
            {data.plans.length === 0 ? (
              <Empty title="No active plan" />
            ) : (
              <ul className="grid gap-2">
                {data.plans.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-xl bg-ink-800/40 px-3 py-2">
                    <Link
                      to={`/admin/training-plans/${p.id}`}
                      className="text-sm font-medium hover:text-accent-300"
                    >
                      {p.name}
                    </Link>
                    <span className="text-xs text-ink-300">
                      {p.daysPerWeek}d / week · {p.days?.length ?? 0} days
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Active nutrition plan</CardTitle>
              <Link to="/admin/nutrition-plans">
                <Button size="sm" variant="secondary">Manage</Button>
              </Link>
            </CardHeader>
            {data.nutrition.length === 0 ? (
              <Empty title="No active nutrition plan" />
            ) : (
              <ul className="grid gap-2">
                {data.nutrition.map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-xl bg-ink-800/40 px-3 py-2">
                    <Link
                      to={`/admin/nutrition-plans/${p.id}`}
                      className="text-sm font-medium hover:text-accent-300"
                    >
                      {p.name}
                    </Link>
                    <span className="text-xs text-ink-300">
                      {p.calories} kcal · {p.proteinG}P/{p.carbsG}C/{p.fatsG}F
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}

      {tab === 'progress' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <LineChartCard
            title="Weight"
            unit=" kg"
            data={data.weights.map((w) => ({ date: w.date, value: w.weightKg }))}
          />
          <LineChartCard
            title="Waist"
            unit=" cm"
            data={data.measurements.map((m) => ({ date: m.date, value: m.waist ?? null }))}
          />
          <LineChartCard
            title="Chest"
            unit=" cm"
            data={data.measurements.map((m) => ({ date: m.date, value: m.chest ?? null }))}
          />
          <LineChartCard
            title="Body fat %"
            unit=" %"
            data={data.measurements.map((m) => ({ date: m.date, value: m.bodyFatPct ?? null }))}
          />
        </div>
      ) : null}

      {tab === 'photos' ? (
        <Card>
          <CardHeader>
            <CardTitle>Progress photos</CardTitle>
          </CardHeader>
          {data.photos.length === 0 ? (
            <Empty title="No photos yet" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {data.photos.map((p) => (
                <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="block">
                  <div className="overflow-hidden rounded-xl border border-ink-700">
                    <img src={p.url} alt="" className="aspect-[3/4] w-full object-cover" />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-ink-300">
                    <span>{p.type}</span>
                    <span>{fmtDate(p.date)}</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {tab === 'notes' ? (
        <NotesPane
          memberId={m.id}
          notes={notes ?? []}
          onCreate={(body, isPrivate) =>
            createNote.mutate(
              { memberId: m.id, body, isPrivate, kind: 'GENERAL' },
              { onSuccess: () => toast.success('Note saved') },
            )
          }
          onDelete={(noteId) =>
            deleteNote.mutate(noteId, { onSuccess: () => toast.success('Note deleted') })
          }
        />
      ) : null}

      <EditMemberModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        defaultValues={{
          fullName: m.fullName,
          phone: m.phone,
          age: profile?.age ?? null,
          heightCm: profile?.heightCm ?? null,
          currentWeightKg: profile?.currentWeightKg ?? null,
          goal: profile?.goal ?? '',
        }}
        onSave={(values) =>
          update.mutate(
            {
              id: m.id,
              body: {
                fullName: values.fullName,
                phone: values.phone,
                profile: {
                  age: values.age,
                  heightCm: values.heightCm,
                  currentWeightKg: values.currentWeightKg,
                  goal: values.goal || null,
                },
              },
            },
            {
              onSuccess: () => {
                toast.success('Profile updated');
                setEditOpen(false);
              },
              onError: (err) => toast.error(getApiErrorMessage(err)),
            },
          )
        }
      />

      <ResetPasswordModal
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        loading={resetPw.isPending}
        onSubmit={(password) =>
          resetPw.mutate(
            { id: m.id, password },
            {
              onSuccess: () => {
                toast.success('Password reset');
                setPwOpen(false);
              },
              onError: (err) => toast.error(getApiErrorMessage(err)),
            },
          )
        }
      />
    </div>
  );
}

function NotesPane({
  notes,
  onCreate,
  onDelete,
}: {
  memberId: string;
  notes: { id: string; body: string; isPrivate: boolean; createdAt: string }[];
  onCreate: (body: string, isPrivate: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [body, setBody] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Add a note</CardTitle>
        </CardHeader>
        <Field label="Note">
          <Textarea
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Coach feedback..."
          />
        </Field>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="h-4 w-4 rounded border-ink-600 bg-ink-800"
          />
          <span>Private (only visible to admin)</span>
        </label>
        <div className="mt-3 text-right">
          <Button
            disabled={!body.trim()}
            onClick={() => {
              onCreate(body, isPrivate);
              setBody('');
              setIsPrivate(false);
            }}
          >
            <Plus className="h-4 w-4" />
            Add note
          </Button>
        </div>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Notes history</CardTitle>
        </CardHeader>
        {notes.length === 0 ? (
          <Empty title="No notes yet" />
        ) : (
          <ul className="grid gap-3">
            {notes.map((n) => (
              <li key={n.id} className="rounded-xl bg-ink-800/40 p-3">
                <div className="flex items-center justify-between text-xs text-ink-300">
                  <span>{fmtRelative(n.createdAt)}</span>
                  <div className="flex items-center gap-2">
                    {n.isPrivate ? <Badge tone="warn">Private</Badge> : null}
                    <button
                      type="button"
                      onClick={() => onDelete(n.id)}
                      className="text-danger hover:text-red-400"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{n.body}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function EditMemberModal({
  open,
  onClose,
  defaultValues,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  defaultValues: {
    fullName: string;
    phone: string;
    age: number | null;
    heightCm: number | null;
    currentWeightKg: number | null;
    goal: string;
  };
  onSave: (values: {
    fullName: string;
    phone: string;
    age: number | null;
    heightCm: number | null;
    currentWeightKg: number | null;
    goal: string;
  }) => void;
}) {
  const [v, setV] = useState(defaultValues);
  useEffect(() => {
    if (open) setV(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return (
    <Modal open={open} onClose={onClose} title="Edit profile" size="md">
      <div className="grid gap-3">
        <Field label="Full name">
          <Input value={v.fullName} onChange={(e) => setV({ ...v, fullName: e.target.value })} />
        </Field>
        <Field label="Phone">
          <Input value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Age">
            <Input
              inputMode="numeric"
              value={v.age ?? ''}
              onChange={(e) => setV({ ...v, age: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </Field>
          <Field label="Height (cm)">
            <Input
              inputMode="decimal"
              value={v.heightCm ?? ''}
              onChange={(e) => setV({ ...v, heightCm: e.target.value === '' ? null : Number(e.target.value) })}
            />
          </Field>
          <Field label="Weight (kg)">
            <Input
              inputMode="decimal"
              value={v.currentWeightKg ?? ''}
              onChange={(e) =>
                setV({ ...v, currentWeightKg: e.target.value === '' ? null : Number(e.target.value) })
              }
            />
          </Field>
        </div>
        <Field label="Goal">
          <Select value={v.goal} onChange={(e) => setV({ ...v, goal: e.target.value })}>
            <option value="">—</option>
            <option value="FAT_LOSS">Fat loss</option>
            <option value="MUSCLE_GAIN">Muscle gain</option>
            <option value="STRENGTH">Strength</option>
            <option value="ENDURANCE">Endurance</option>
            <option value="GENERAL_FITNESS">General fitness</option>
            <option value="RECOMP">Recomposition</option>
          </Select>
        </Field>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(v)}>
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function ResetPasswordModal({
  open,
  onClose,
  loading,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  onSubmit: (password: string) => void;
}) {
  const [pw, setPw] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Reset password" size="sm">
      <Field label="New password">
        <Input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Min 6 characters" />
      </Field>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button disabled={pw.length < 6} loading={loading} onClick={() => onSubmit(pw)}>
          Update
        </Button>
      </div>
    </Modal>
  );
}
