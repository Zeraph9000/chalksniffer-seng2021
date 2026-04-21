import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface NeedsAttentionPanelProps {
  title: string;
  subtitle?: string;
  /** Header badge copy, e.g. "2 waiting" */
  countLabel?: string;
  /** Dot colour indicator on left of header. Defaults to warn. */
  tone?: "warn" | "danger" | "ink";
  /** Optional footer link shown at bottom of panel. */
  footerLink?: { label: string; href: string };
  className?: string;
  children: React.ReactNode;
}

const dotTone: Record<NonNullable<NeedsAttentionPanelProps["tone"]>, string> = {
  warn: "bg-warn",
  danger: "bg-danger",
  ink: "bg-ink",
};

const countTone: Record<NonNullable<NeedsAttentionPanelProps["tone"]>, string> = {
  warn: "bg-warn-bg text-warn",
  danger: "bg-danger-soft text-danger",
  ink: "bg-paper-2 text-ink-2 border border-line",
};

export function NeedsAttentionPanel({
  title,
  subtitle,
  countLabel,
  tone = "warn",
  footerLink,
  className,
  children,
}: NeedsAttentionPanelProps) {
  return (
    <section
      className={cn(
        "bg-paper border border-line rounded-[14px] overflow-hidden",
        className
      )}
    >
      <header className="px-[22px] py-4 border-b border-line-2 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <span className={cn("w-2 h-2 rounded-full", dotTone[tone])} />
          <div>
            <div className="font-display font-semibold text-[14px] tracking-[-.01em] text-ink">
              {title}
            </div>
            {subtitle ? (
              <div className="text-[12px] text-ink-3 mt-px">{subtitle}</div>
            ) : null}
          </div>
        </div>
        {countLabel ? (
          <span
            className={cn(
              "font-mono text-[11px] px-2 py-0.5 rounded-full font-medium",
              countTone[tone]
            )}
          >
            {countLabel}
          </span>
        ) : null}
      </header>
      <div>{children}</div>
      {footerLink ? (
        <Link
          href={footerLink.href}
          className="block px-[22px] py-3 border-t border-line-2 text-[12.5px] font-medium text-ink text-center bg-paper hover:bg-paper-2"
        >
          {footerLink.label} →
        </Link>
      ) : null}
    </section>
  );
}
