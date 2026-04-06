import Link from "next/link";
import { Inbox } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
};

export function EmptyState({ title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <section className="flex flex-col items-center justify-center rounded-xl border border-dashed border-surface-border bg-white py-16 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent-primary-muted" aria-hidden="true">
        <Inbox size={24} className="text-accent-primary" />
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 text-sm text-ink-muted leading-relaxed max-w-xs">{description}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-primary mt-6 text-sm">
          {actionLabel}
        </Link>
      )}
    </section>
  );
}
