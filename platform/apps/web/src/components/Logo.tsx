import { cn } from '@/lib/cn';

export function Logo({ className, brand = 'Coach Pro' }: { className?: string; brand?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-bold tracking-tight', className)}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-400 text-ink-950 font-black">
        CP
      </span>
      <span className="display text-lg uppercase">{brand}</span>
    </span>
  );
}
