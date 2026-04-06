import { Order } from "@/lib/types";

export function OrderDetailCard({ order }: { order: Order }) {
  const total = order.anticipatedMonetaryTotal?.payableAmount;

  const fields = [
    { label: "Order ID", value: order.id, mono: true },
    { label: "Issue Date", value: order.issueDate },
    { label: "Currency", value: order.documentCurrencyCode, mono: true },
    {
      label: "Total",
      value: total != null ? `${total} ${order.documentCurrencyCode}` : "\u2014",
      highlight: true,
    },
    { label: "Buyer", value: order.buyerCustomerParty.party.partyName },
    { label: "Seller", value: order.sellerSupplierParty.party.partyName },
    { label: "Line Items", value: String(order.orderLines.length), mono: true },
    ...(order.note ? [{ label: "Note", value: order.note }] : []),
  ];

  return (
    <div className="card p-6">
      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        {fields.map((field) => (
          <div key={field.label}>
            <p className="text-xs font-medium uppercase text-ink-faint">
              {field.label}
            </p>
            <p
              className={`mt-1.5 text-sm ${
                field.highlight
                  ? "font-semibold font-mono text-ink"
                  : field.mono
                  ? "font-mono text-ink"
                  : "text-ink"
              }`}
            >
              {field.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
