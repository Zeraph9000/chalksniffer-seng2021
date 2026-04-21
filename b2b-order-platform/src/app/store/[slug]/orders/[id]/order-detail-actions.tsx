"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConfirmReceiptButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/confirm-receipt`, {
        method: "POST",
      });
      if (res.ok) router.refresh();
      else alert("Failed to confirm. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={busy}
      size="md"
      className="bg-accent text-paper hover:opacity-90 border-0 gap-2"
    >
      <Check className="h-4 w-4" />
      {busy ? "Saving…" : "Mark as received"}
    </Button>
  );
}

export function CopyTrackingButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop — fall back silently if clipboard API is unavailable.
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={onClick} className="gap-1.5">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
