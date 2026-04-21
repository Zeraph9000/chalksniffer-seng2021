"use client";

import { Toaster as Sonner } from "sonner";
import { cn } from "@/lib/utils";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ className, ...props }: ToasterProps) => (
  <Sonner
    className={cn("toaster group", className)}
    position="bottom-center"
    toastOptions={{
      classNames: {
        toast:
          "group flex items-center gap-[10px] rounded-full bg-ink text-paper px-[14px] py-[10px] shadow-[0_12px_32px_rgba(10,12,16,0.24)] text-[12.5px]",
        description: "text-paper/80",
        actionButton: "bg-paper text-ink font-medium rounded-full px-3 py-1",
        cancelButton: "text-paper/70 underline underline-offset-2",
      },
    }}
    {...props}
  />
);

export { Toaster };
