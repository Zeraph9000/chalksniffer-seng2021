export type UblLineForInvoice = {
  lineItem: {
    id: string;
    quantity: number;
    unitCode?: string;
    price: { priceAmount: number; currencyID: string };
    item: { name: string; description?: string | null };
  };
};

export type InvoiceItem = {
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  unit_code: string;
};

/**
 * Map UBL Order lines to LastMinutePush Invoice line-item shape.
 * Service auto-calculates subtotal, tax, and payable_amount from these rows.
 */
export function buildInvoiceItems(lines: UblLineForInvoice[]): InvoiceItem[] {
  return lines.map((l) => ({
    name: l.lineItem.item.name,
    description: l.lineItem.item.description ?? null,
    quantity: l.lineItem.quantity,
    unit_price: l.lineItem.price.priceAmount,
    unit_code: l.lineItem.unitCode || "EA",
  }));
}
