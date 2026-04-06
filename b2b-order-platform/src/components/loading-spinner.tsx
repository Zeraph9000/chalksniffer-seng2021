export function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16" role="status" aria-live="polite">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-surface-border border-t-accent-primary" />
      <p className="mt-3 text-sm text-ink-muted">{message}</p>
    </div>
  );
}
