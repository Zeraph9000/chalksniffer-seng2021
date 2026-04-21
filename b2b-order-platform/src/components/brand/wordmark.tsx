import * as React from "react";
import { cn } from "@/lib/utils";

export interface WordmarkProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: "sm" | "md" | "lg";
}

const sizeClass = {
  sm: "text-[18px]",
  md: "text-[22px]",
  lg: "text-[40px]",
};

export function Wordmark({ size = "md", className, ...props }: WordmarkProps) {
  return (
    <span
      className={cn(
        "font-display font-bold leading-none tracking-[-.035em] text-ink inline-flex items-baseline",
        sizeClass[size],
        className
      )}
      {...props}
    >
      Ledg
      <em className="not-italic font-medium text-hot -ml-[0.5px]" style={{ fontStyle: "italic" }}>
        r
      </em>
    </span>
  );
}
