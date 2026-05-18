import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Stat({
  label,
  value,
  hint,
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('surface-card flex items-start gap-4', className)}>
      {icon ? (
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-900/30 text-accent-300">
          {icon}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="label-faded">{label}</div>
        <div className="display mt-1 text-3xl font-bold leading-none">{value}</div>
        {hint ? <div className="mt-1 text-xs text-ink-200">{hint}</div> : null}
      </div>
    </div>
  );
}
