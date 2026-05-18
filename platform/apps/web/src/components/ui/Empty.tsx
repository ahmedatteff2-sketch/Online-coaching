import { type ReactNode } from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '@/lib/cn';

export function Empty({
  title = 'Nothing here yet',
  description,
  action,
  icon,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('surface-card flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-ink-800 text-ink-200">
        {icon ?? <Inbox className="h-5 w-5" />}
      </div>
      <h4 className="mb-1 text-sm font-semibold">{title}</h4>
      {description ? <p className="mb-4 max-w-md text-sm text-ink-200">{description}</p> : null}
      {action}
    </div>
  );
}
