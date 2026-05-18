import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { useDeleteMember, useMembers } from '@/api/admin';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Empty } from '@/components/ui/Empty';
import { Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/PageHeader';
import { fmtDate } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/apiError';
import type { MemberStatus } from '@/api/types';

const statusTone: Record<MemberStatus, 'success' | 'warn' | 'danger'> = {
  ACTIVE: 'success',
  INACTIVE: 'warn',
  EXPIRED: 'danger',
};

export function MembersListPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'' | MemberStatus>('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMembers({
    search: search || undefined,
    status: status || undefined,
    page,
    pageSize: 20,
  });
  const remove = useDeleteMember();

  return (
    <div>
      <PageHeader
        title="Members"
        description="Add, edit and review members of your coaching."
        actions={
          <Link to="/admin/members/new">
            <Button>
              <UserPlus className="h-4 w-4" />
              Add member
            </Button>
          </Link>
        }
      />

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            {(['', 'ACTIVE', 'INACTIVE', 'EXPIRED'] as const).map((s) => (
              <Button
                key={s || 'all'}
                size="sm"
                variant={status === s ? 'primary' : 'secondary'}
                onClick={() => {
                  setPage(1);
                  setStatus(s);
                }}
              >
                {s || 'All'}
              </Button>
            ))}
          </div>
        </div>

        {isLoading || !data ? (
          <div className="grid gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          <Empty
            title="No members yet"
            description="Add your first member to start coaching."
            icon={<Plus className="h-5 w-5" />}
            action={
              <Link to="/admin/members/new">
                <Button size="sm">Add member</Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-ink-300">
                <tr>
                  <th className="py-2">Name</th>
                  <th className="py-2">Phone</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Goal</th>
                  <th className="py-2">Joined</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700/60">
                {data.items.map((m) => (
                  <tr key={m.id} className="hover:bg-ink-800/40">
                    <td className="py-2">
                      <Link
                        to={`/admin/members/${m.id}`}
                        className="flex items-center gap-3 font-medium hover:text-accent-300"
                      >
                        {m.profileImage ? (
                          <img
                            src={m.profileImage}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="grid h-8 w-8 place-items-center rounded-full bg-ink-700 text-xs">
                            {m.fullName.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        {m.fullName}
                      </Link>
                    </td>
                    <td className="py-2 text-ink-200">{m.phone}</td>
                    <td className="py-2">
                      <Badge tone={statusTone[m.memberProfile?.status ?? 'ACTIVE']}>
                        {m.memberProfile?.status ?? 'ACTIVE'}
                      </Badge>
                    </td>
                    <td className="py-2 text-ink-200">
                      {m.memberProfile?.goal?.replace(/_/g, ' ').toLowerCase() ?? '—'}
                    </td>
                    <td className="py-2 text-ink-200">{fmtDate(m.createdAt)}</td>
                    <td className="py-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (!confirm(`Delete ${m.fullName}? This cannot be undone.`)) return;
                          remove.mutate(m.id, {
                            onSuccess: () => toast.success('Member deleted'),
                            onError: (err) => toast.error(getApiErrorMessage(err)),
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-danger" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.meta && data.meta.total > data.meta.pageSize ? (
              <div className="mt-4 flex items-center justify-between text-sm text-ink-200">
                <span>
                  Showing {(data.meta.page - 1) * data.meta.pageSize + 1}–
                  {Math.min(data.meta.page * data.meta.pageSize, data.meta.total)} of {data.meta.total}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page * data.meta.pageSize >= data.meta.total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </div>
  );
}
