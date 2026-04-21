"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OrderStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const CANCEL_REASONS = [
  "Out of stock",
  "Buyer requested cancellation",
  "Delivery address unreachable",
  "Suspected fraud",
  "Other…",
];

export interface OrderActionsProps {
  orderId: string;
  status: OrderStatus;
  buyerName: string;
  total: number;
  invoiceId: string | null;
}

export function OrderActions({ orderId, status, buyerName, total, invoiceId }: OrderActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [reason, setReason] = React.useState(CANCEL_REASONS[0]);
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  async function describeFailure(res: Response, fallback: string): Promise<string> {
    const body = (await res.json().catch(() => null)) as { message?: string; error?: string } | null;
    if (!body) return `${fallback} (HTTP ${res.status})`;
    return body.message ?? body.error ?? fallback;
  }

  async function onDespatch() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/orders/${orderId}/despatch`, { method: "POST" });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(await describeFailure(res, "Despatch failed"));
  }

  async function onIssueInvoice() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/orders/${orderId}/invoice`, { method: "POST" });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError(await describeFailure(res, "Invoice creation failed"));
  }

  async function onConfirmCancel() {
    setBusy(true);
    setError(null);
    const body = note ? `${reason} — ${note}` : reason;
    const res = await fetch(`/api/orders/${orderId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: body }),
    });
    setBusy(false);
    if (res.ok) {
      setCancelOpen(false);
      router.refresh();
    } else {
      setError(await describeFailure(res, "Cancel failed"));
    }
  }

  const canCancel = status === "placed" || status === "paid";

  return (
    <div className="flex flex-col items-end gap-2">
      {error && <div className="text-[12px] text-danger">{error}</div>}
      <div className="flex flex-wrap justify-end gap-2">
        {status === "paid" && (
          <>
            <Button
              variant="ghost"
              className="h-[42px] border-line px-[18px] text-[13.5px] text-danger hover:border-danger hover:bg-paper hover:text-danger"
              onClick={() => setCancelOpen(true)}
              disabled={busy}
            >
              Cancel order
            </Button>
            <Button
              className="h-[42px] bg-accent px-[18px] text-[13.5px] text-paper hover:bg-accent/90"
              onClick={onDespatch}
              disabled={busy}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7" />
                <circle cx="7.5" cy="17.5" r="1.5" />
                <circle cx="17.5" cy="17.5" r="1.5" />
              </svg>
              Mark as despatched
            </Button>
          </>
        )}

        {status === "placed" && (
          <Button
            variant="ghost"
            className="h-[42px] border-line px-[18px] text-[13.5px] text-danger hover:border-danger hover:bg-paper hover:text-danger"
            onClick={() => setCancelOpen(true)}
            disabled={busy}
          >
            Cancel order
          </Button>
        )}

        {status === "despatched" && (
          <Button
            variant="ghost"
            className="h-[42px] border-line px-[18px] text-[13.5px] text-danger opacity-60"
            disabled
            title="Already despatched"
          >
            Cancel order
          </Button>
        )}

        {status === "received" && (
          <Button
            className="h-[42px] bg-hot px-[18px] text-[13.5px] text-paper hover:bg-hot/90"
            onClick={onIssueInvoice}
            disabled={busy}
          >
            Issue invoice
          </Button>
        )}

        {status === "invoiced" && invoiceId && (
          <Button asChild className="h-[42px] px-[18px] text-[13.5px]">
            <Link href={`/dashboard/invoices/${invoiceId}`}>View invoice</Link>
          </Button>
        )}
      </div>

      {canCancel && (
        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-danger">Cancel order {orderId}?</DialogTitle>
            </DialogHeader>
            <div className="px-[22px] py-5">
              <DialogDescription className="mb-4">
                The buyer (<strong className="font-display font-semibold text-ink">{buyerName}</strong>) will
                be refunded{" "}
                <strong className="font-display font-semibold text-ink">${total.toFixed(2)}</strong>{" "}
                automatically. This cannot be undone once confirmed.
              </DialogDescription>
              <div>
                <Label
                  htmlFor="cancel-reason"
                  className="mb-[6px] block text-[11.5px] font-medium uppercase tracking-[.08em] text-ink-3"
                >
                  Reason
                </Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="cancel-reason" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CANCEL_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  className="mt-3 min-h-[72px] text-[13px]"
                  placeholder="Optional note to the buyer (visible on their order detail)…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                {error && <div className="mt-2 text-[12px] text-danger">{error}</div>}
              </div>
            </div>
            <DialogFooter>
              <div className="flex-1 text-[11.5px] leading-[1.4] text-ink-3">
                The buyer is notified via email with the reason above.
              </div>
              <div className="flex gap-[10px]">
                <Button
                  variant="ghost"
                  className="h-11 px-[22px]"
                  onClick={() => setCancelOpen(false)}
                  disabled={busy}
                >
                  Keep order
                </Button>
                <Button
                  className="h-11 bg-danger px-[22px] text-paper hover:bg-danger/90"
                  onClick={onConfirmCancel}
                  disabled={busy}
                >
                  Cancel &amp; refund
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
