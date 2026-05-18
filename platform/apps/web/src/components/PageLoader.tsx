export function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-ink-600 border-t-accent-400" />
        <p className="text-xs uppercase tracking-[0.3em] text-ink-300">Loading</p>
      </div>
    </div>
  );
}
