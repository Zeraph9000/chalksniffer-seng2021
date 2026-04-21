"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckoutHeader,
  CheckoutProgress,
} from "@/components/ledgr/checkout-chrome";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";

function SuccessInner() {
  const params = useSearchParams();
  const orderId = params.get("orderId") || "";
  const token = params.get("t");
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setUrl(
      `${window.location.origin}/orders/${orderId}${token ? `?t=${token}` : ""}`
    );
  }, [orderId, token]);

  const shopName = "Your shop";
  const monogram = "·";

  return (
    <main className="min-h-screen bg-paper-2 py-6 px-4">
      <div className="max-w-[1200px] mx-auto bg-paper border border-line rounded-[12px] overflow-hidden">
        <CheckoutHeader shop={{ monogram, name: shopName }} />
        <CheckoutProgress current={4} />

        <div className="max-w-[720px] mx-auto mt-8 px-6 pb-14">
          {/* Success banner */}
          <div className="border border-accent bg-accent-soft rounded-[14px] px-9 py-8 flex gap-5 items-center">
            <div className="w-[52px] h-[52px] rounded-full bg-accent text-paper grid place-items-center shrink-0">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m4 12 5 5 11-11" />
              </svg>
            </div>
            <div>
              <div className="font-display font-semibold text-[22px] tracking-[-.015em] text-ink">
                Order placed — thank you!
              </div>
              <div className="text-[13px] text-ink-2 mt-1">
                A receipt is on its way to your email. The shop will send your
                tracking link once despatched.
              </div>
            </div>
          </div>

          {/* Order number row */}
          <div className="flex items-baseline gap-[10px] mt-5 flex-wrap">
            <span className="text-[11.5px] text-ink-3 uppercase tracking-[.12em]">
              Order
            </span>
            <span className="font-mono text-[22px] font-medium tracking-[-.01em] text-ink">
              {orderId || "—"}
            </span>
            <Chip tone="paid" withDot className="ml-1">
              Paid · awaiting despatch
            </Chip>
          </div>

          {/* Tracking card */}
          {url && (
            <div className="mt-[22px] border border-line rounded-[10px] px-[18px] py-4 flex justify-between items-center bg-paper gap-4">
              <div className="min-w-0 flex-1">
                <div className="text-[11.5px] text-ink-3 uppercase tracking-[.1em]">
                  Order tracking
                </div>
                <div className="font-mono text-[13.5px] text-ink mt-1 break-all">
                  {url}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(url);
                  setCopied(true);
                }}
                className="shrink-0"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
          )}

          {/* Receipt card */}
          <div className="mt-6 border border-line rounded-[12px] overflow-hidden bg-paper">
            <div className="px-5 py-4 border-b border-line-2 flex items-center gap-[10px] bg-paper-2">
              <div className="w-[26px] h-[26px] rounded-[6px] bg-brand-surface text-brand-contrast grid place-items-center font-display font-bold text-[11.5px] tracking-[-.015em]">
                {monogram}
              </div>
              <div className="font-display font-semibold text-[14px] tracking-[-.01em] text-ink">
                {shopName}
              </div>
            </div>

            <div className="px-5 py-4">
              <div className="text-[11.5px] text-ink-3 uppercase tracking-[.1em] font-medium mb-2">
                Delivery
              </div>
              <div className="text-[13px] leading-[1.55] text-ink-2">
                See your order details for the shipping address on file.
              </div>
            </div>
          </div>

          <div className="mt-[22px] flex gap-[10px]">
            <Button asChild size="lg">
              <Link href={`/orders/${orderId}${token ? `?t=${token}` : ""}`}>
                View order →
              </Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link href="/">Continue shopping</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper-2" />}>
      <SuccessInner />
    </Suspense>
  );
}
