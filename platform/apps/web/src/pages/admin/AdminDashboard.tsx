import { Link } from 'react-router-dom';
import { Users, Activity, Camera, Scale, Clock } from 'lucide-react';
import { useAdminOverview } from '@/api/admin';
import { Card } from '@/components/ui/Card';
import { Stat } from '@/components/ui/Stat';
import { Skeleton } from '@/components/ui/Skeleton';
import { Empty } from '@/components/ui/Empty';
import { PageHeader } from '@/components/PageHeader';
import { fmtRelative, fmtKg } from '@/lib/format';

export function AdminDashboard() {
  const { data, isLoading } = useAdminOverview();
  return (
    <div>
      <PageHeader
        title="Overview"
        description="Snapshot of activity across your members"
      />

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total members" value={data.totals.totalMembers} icon={<Users className="h-5 w-5" />} />
            <Stat label="Active" value={data.totals.activeMembers} icon={<Activity className="h-5 w-5" />} />
            <Stat label="Inactive" value={data.totals.inactiveMembers} icon={<Clock className="h-5 w-5" />} />
            <Stat label="Expired" value={data.totals.expiredMembers} icon={<Clock className="h-5 w-5" />} />
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <Card>
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
                <Scale className="h-4 w-4 text-accent-300" /> Recent weights
              </h3>
              {data.recentWeights.length === 0 ? (
                <Empty title="No recent weight logs" />
              ) : (
                <ul className="grid gap-3">
                  {data.recentWeights.map((w) => (
                    <li key={w.id} className="flex items-center justify-between rounded-xl bg-ink-800/40 px-3 py-2">
                      <div>
                        <Link
                          to={`/admin/members/${w.member.id}`}
                          className="text-sm font-medium hover:text-accent-300"
                        >
                          {w.member.fullName}
                        </Link>
                        <div className="text-xs text-ink-300">{fmtRelative(w.date)}</div>
                      </div>
                      <span className="text-sm font-semibold">{fmtKg(w.weightKg)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
                <Activity className="h-4 w-4 text-accent-300" /> Recent workouts
              </h3>
              {data.recentWorkouts.length === 0 ? (
                <Empty title="No recent workouts" />
              ) : (
                <ul className="grid gap-3">
                  {data.recentWorkouts.map((w) => (
                    <li key={w.id} className="flex items-center justify-between rounded-xl bg-ink-800/40 px-3 py-2">
                      <Link
                        to={`/admin/members/${w.member.id}`}
                        className="text-sm font-medium hover:text-accent-300"
                      >
                        {w.member.fullName}
                      </Link>
                      <span className="text-xs text-ink-300">{fmtRelative(w.date)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
                <Camera className="h-4 w-4 text-accent-300" /> Recent photos
              </h3>
              {data.recentPhotos.length === 0 ? (
                <Empty title="No recent progress photos" />
              ) : (
                <ul className="grid gap-3">
                  {data.recentPhotos.slice(0, 5).map((p) => (
                    <li key={p.id} className="flex items-center gap-3 rounded-xl bg-ink-800/40 p-2">
                      <img src={p.url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <Link
                          to={`/admin/members/${p.member.id}`}
                          className="block truncate text-sm font-medium hover:text-accent-300"
                        >
                          {p.member.fullName}
                        </Link>
                        <div className="text-xs text-ink-300">
                          {p.type} · {fmtRelative(p.date)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
