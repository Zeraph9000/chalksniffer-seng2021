import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-[88px] w-full rounded-md border border-line bg-paper px-[14px] py-3 text-[13.5px] text-ink leading-[1.55]",
        "placeholder:text-ink-4",
        "transition-colors focus-visible:outline-none focus-visible:border-ink focus-visible:ring-[3px] focus-visible:ring-ink/[0.08]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Textarea };
