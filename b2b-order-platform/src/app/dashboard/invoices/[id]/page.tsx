"use client";
import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { InvoiceDetail } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";

type InvoiceStatus = "draft" | "sent" | "paid";

function formatIssued(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function monogram(name: string | null | undefined): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "—";
}

export default function SellerInvoiceDetail() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [invoice, setInvoice] = React.useState<InvoiceDetail | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/invoices/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          setErr(r.status === 404 ? "Invoice not found." : "Could not load invoice.");
          return;
        }
        const data = (await r.json()) as InvoiceDetail;
        setInvoice(data);
      })
      .catch(() => setErr("Could not load invoice."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main>
        <div className="flex items-center gap-2 bg-paper px-8 py-[14px] text-[12.5px] text-ink-3">
          <Link href="/dashboard/invoices" className="hover:text-ink">Invoices</Link>
          <span>·</span>
          <span className="text-ink">{id}</span>
        </div>
        <div className="mx-auto max-w-[1080px] px-8 py-7 text-[13px] text-ink-3">Loading…</div>
      </main>
    );
  }

  if (err || !invoice) {
    return (
      <main>
        <div className="flex items-center gap-2 bg-paper px-8 py-[14px] text-[12.5px] text-ink-3">
          <Link href="/dashboard/invoices" className="hover:text-ink">Invoices</Link>
        </div>
        <div className="mx-auto max-w-[1080px] px-8 py-7">
          <EmptyState title="Invoice unavailable" body={err ?? "Something went wrong."} />
        </div>
      </main>
    );
  }

  const status = (invoice.status ?? "draft") as InvoiceStatus;
  const statusTone: Record<InvoiceStatus, "draft" | "sent" | "paid"> = {
    draft: "draft",
    sent: "sent",
    paid: "paid",
  };
  const statusLabel: Record<InvoiceStatus, string> = {
    draft: "Draft",
    sent: "Sent",
    paid: invoice.payment_date ? `Paid — ${formatIssued(invoice.payment_date)}` : "Paid",
  };

  const supplierName = invoice.supplier?.name ?? "Supplier";
  const customerName = invoice.customer?.name ?? "Customer";

  const subtotal = invoice.subtotal ?? 0;
  const taxInclusive = invoice.tax_inclusive_amount ?? subtotal;
  const gst = Math.max(0, taxInclusive - (invoice.tax_exclusive_amount ?? subtotal));
  const total = invoice.payable_amount ?? taxInclusive;

  return (
    <main>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 bg-paper px-8 py-[14px] text-[12.5px] text-ink-3">
        <Link href="/dashboard/invoices" className="hover:text-ink">Invoices</Link>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m9 6 6 6-6 6" />
        </svg>
        <span className="text-ink">{invoice.invoice_id}</span>
      </div>

      <div className="mx-auto max-w-[1080px] px-8 py-7">
        {/* Header card */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-line bg-paper px-[30px] py-[26px]">
          <div className="min-w-0">
            <div className="mb-[6px] text-[11.5px] uppercase tracking-[.1em] text-ink-3">Tax invoice</div>
            <div className="font-display text-[28px] font-semibold leading-[1.1] tracking-[-.02em]">
              {invoice.invoice_id}
            </div>
            <div className="mt-[6px] flex flex-wrap items-center gap-[10px] text-[13px] text-ink-3">
              <span>Issued {formatIssued(invoice.issue_date)}</span>
              <span className="text-ink-4">·</span>
              <span>
                Order{" "}
                <Link
                  href={`/dashboard/orders/${invoice.order_reference}`}
                  className="text-ink-2 underline underline-offset-[3px] hover:text-ink"
                >
                  {invoice.order_reference}
                </Link>
              </span>
              <span className="text-ink-4">·</span>
              <Chip tone={statusTone[status]} withDot>
                {statusLabel[status]}
              </Chip>
            </div>
          </div>
          <div className="flex flex-col items-end gap-[10px]">
            <div className="font-mono text-[22px] font-medium tracking-[-.01em]">
              ${total.toFixed(2)}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                asChild
                variant="ghost"
                className="h-[42px] px-[18px] text-[13.5px]"
              >
                <a href={`/api/invoices/${invoice.invoice_id}/ubl`} rel="noopener noreferrer">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
                    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                  </svg>
                  Download UBL XML
                </a>
              </Button>
              <Button asChild className="h-[42px] px-[18px] text-[13.5px]">
                <a
                  href={`/api/invoices/${invoice.invoice_id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 3h10l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
                    <path d="M15 3v5h5" />
                  </svg>
                  Download PDF
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Party blocks */}
        <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          <PartyCard role="From (supplier)" name={supplierName} monoTag={monogram(supplierName)} meta={[
            { k: "ABN", v: invoice.supplier?.identifier ?? "—", mono: true },
          ]} />
          <PartyCard role="To (customer)" name={customerName} monoTag={monogram(customerName)} meta={[
            { k: "ID", v: invoice.customer?.identifier ?? "—", mono: true },
          ]} />
        </div>

        {/* Line items card */}
        <div className="overflow-hidden rounded-[12px] border border-line bg-paper">
          <div className="grid grid-cols-[1.6fr_.6fr_.9fr_.9fr] gap-4 border-b border-line-2 bg-paper-2 px-6 py-3 text-[10.5px] font-medium uppercase tracking-[.12em] text-ink-3">
            <div>Description</div>
            <div className="text-right">Qty</div>
            <div className="text-right">Unit price</div>
            <div className="text-right">Line total</div>
          </div>
          {invoice.items.map((it, i) => (
            <div
              key={i}
              className={`grid grid-cols-[1.6fr_.6fr_.9fr_.9fr] items-center gap-4 px-6 py-3 ${
                i === 0 ? "" : "border-t border-line-2"
              }`}
            >
              <div>
                <div className="font-display text-[13.5px] font-medium">{it.name}</div>
                {(it.description || it.unit_code) && (
                  <div className="mt-[2px] font-mono text-[11.5px] text-ink-3">
                    {it.description ? `${it.description} · ` : ""}
                    {it.unit_code}
                  </div>
                )}
              </div>
              <div className="text-right font-mono text-[13px]">{it.quantity}</div>
              <div className="text-right font-mono text-[13px]">${it.unit_price.toFixed(2)}</div>
              <div className="text-right font-mono text-[13px]">${it.line_total.toFixed(2)}</div>
            </div>
          ))}

          {/* Totals */}
          <div className="grid grid-cols-[1fr_auto] px-7 pt-6">
            <div />
            <div className="ml-auto w-[280px]">
              <TotalLine k="Subtotal" v={`$${subtotal.toFixed(2)}`} />
              <TotalLine k="GST (10%)" v={`$${gst.toFixed(2)}`} />
              <TotalLine k="Shipping" v="Included" />
              <div className="mt-2 flex justify-between border-t border-line pt-3 font-display text-[17px] font-bold text-ink">
                <span>Total (incl. GST)</span>
                <span className="font-mono text-[18px] font-bold">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-[18px] grid grid-cols-1 gap-6 border-t border-line-2 px-7 py-5 text-[12.5px] md:grid-cols-2">
            <div>
              <div className="mb-[6px] text-[10.5px] font-medium uppercase tracking-[.12em] text-ink-3">
                Payment reference
              </div>
              <div className="font-mono text-[12.5px] text-ink-2">
                {invoice.invoice_id}
                {invoice.payment_date ? ` · paid ${formatIssued(invoice.payment_date)}` : ""}
              </div>
            </div>
            <div>
              <div className="mb-[6px] text-[10.5px] font-medium uppercase tracking-[.12em] text-ink-3">
                Notes
              </div>
              <div className="text-[12.5px] leading-[1.55] text-ink-2">
                GST-inclusive. Prices in {invoice.currency}. Generated by Ledgr on behalf of the supplier.
                Peppol-compatible UBL XML available above.
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function PartyCard({
  role,
  name,
  monoTag,
  meta,
}: {
  role: string;
  name: string;
  monoTag: string;
  meta: { k: string; v: string; mono?: boolean }[];
}) {
  return (
    <div className="rounded-[12px] border border-line bg-paper px-6 py-[22px]">
      <div className="text-[10.5px] font-medium uppercase tracking-[.12em] text-ink-3">{role}</div>
      <div className="mt-[6px] flex items-center gap-[10px] font-display text-[17px] font-semibold tracking-[-.015em]">
        <span className="grid h-6 w-6 place-items-center rounded-[6px] bg-brand-surface font-display text-[10px] font-bold tracking-[-.02em] text-brand-contrast">
          {monoTag}
        </span>
        {name}
      </div>
      <div className="mt-2 text-[13px] leading-[1.7] text-ink-2">
        {meta.map((m) => (
          <div key={m.k}>
            <span className="mr-1 inline-block w-[62px] font-mono text-[11px] uppercase tracking-[.04em] text-ink-3">
              {m.k}
            </span>
            <span className={m.mono ? "font-mono" : ""}>{m.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TotalLine({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-[6px] text-[13px] text-ink-2">
      <span className="text-ink-3">{k}</span>
      <span className="font-mono font-medium">{v}</span>
    </div>
  );
}
