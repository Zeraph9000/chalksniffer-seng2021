import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Wordmark } from "./wordmark";
import { cn } from "@/lib/utils";

export interface BrandLockupProps {
  size?: "sm" | "md" | "lg";
  href?: string;
  variant?: "dark" | "light";
  className?: string;
}

const logoHeight = {
  sm: 14,
  md: 18,
  lg: 32,
};

const wordmarkSize = {
  sm: "sm" as const,
  md: "md" as const,
  lg: "lg" as const,
};

export function BrandLockup({ size = "md", href = "/", variant = "dark", className }: BrandLockupProps) {
  const logo = variant === "light" ? "/ledgr-logo-white.png" : "/ledgr-logo.png";
  const h = logoHeight[size];
  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-2 no-underline",
        variant === "light" && "text-paper",
        className
      )}
    >
      <Image src={logo} alt="" width={h} height={h} className="h-auto" style={{ height: `${h}px`, width: "auto" }} />
      <Wordmark size={wordmarkSize[size]} className={variant === "light" ? "text-paper" : undefined} />
    </span>
  );
  return href ? (
    <Link href={href} aria-label="Ledgr home" className="inline-flex">
      {content}
    </Link>
  ) : content;
}
