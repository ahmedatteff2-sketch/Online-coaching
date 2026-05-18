import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'default' | 'success' | 'warn' | 'danger' | 'muted';

const toneClasses: Record<Tone, string> = {
  default: 'bg-ink-800 text-ink-100 border-ink-700',
  success: 'bg-accent-900/40 text-accent-300 border-accent-700/50',
  warn: 'bg-yellow-900/30 text-yellow-300 border-yellow-700/50',
  danger: 'bg-red-900/30 text-red-300 border-red-700/50',
  muted: 'bg-ink-800/60 text-ink-200 border-ink-700/60',
};

export function Badge({
  tone = 'default',
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
