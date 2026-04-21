import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "h-[42px] w-full rounded-md border border-line bg-paper px-[14px] text-[13.5px] text-ink",
        "placeholder:text-ink-4",
        "transition-colors focus-visible:outline-none focus-visible:border-ink focus-visible:ring-[3px] focus-visible:ring-ink/[0.08]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
