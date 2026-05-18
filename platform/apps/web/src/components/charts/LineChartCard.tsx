import { Card } from '@/components/ui/Card';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Empty } from '@/components/ui/Empty';

export interface ChartPoint {
  date: string;
  value: number | null;
}

export function LineChartCard({
  title,
  data,
  unit = '',
  color = '#22e36a',
  emptyMessage = 'No data yet',
  height = 220,
}: {
  title: string;
  data: ChartPoint[];
  unit?: string;
  color?: string;
  emptyMessage?: string;
  height?: number;
}) {
  const filtered = data.filter((d) => d.value != null);
  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {filtered.length === 0 ? (
        <Empty title={emptyMessage} className="!py-8" />
      ) : (
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer>
            <LineChart data={filtered} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#1f2533" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#8b94ad', fontSize: 11 }}
                tickFormatter={(v) => format(parseISO(v), 'd MMM')}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#8b94ad', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={40}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  background: '#10141d',
                  border: '1px solid #2a3142',
                  borderRadius: 8,
                  color: '#c5cbdb',
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v}${unit}`, '']}
                labelFormatter={(l) => format(parseISO(String(l)), 'd MMM yyyy')}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={{ r: 2.5 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
