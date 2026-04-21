import { buildInvoiceItems } from "@/lib/invoice-builder";

test("maps UBL order lines to invoice items", () => {
  const lines = [
    { lineItem: { id: "1", quantity: 2, unitCode: "EA", price: { priceAmount: 10, currencyID: "AUD" }, item: { name: "Cake", description: "Rich" } } },
    { lineItem: { id: "2", quantity: 1, unitCode: "KG", price: { priceAmount: 5, currencyID: "AUD" }, item: { name: "Flour" } } },
  ];
  const items = buildInvoiceItems(lines);
  expect(items).toEqual([
    { name: "Cake", description: "Rich", quantity: 2, unit_price: 10, unit_code: "EA" },
    { name: "Flour", description: null, quantity: 1, unit_price: 5, unit_code: "KG" },
  ]);
});

test("defaults unitCode to EA when missing", () => {
  const items = buildInvoiceItems([
    { lineItem: { id: "1", quantity: 1, price: { priceAmount: 1, currencyID: "AUD" }, item: { name: "X" } } } as unknown as Parameters<typeof buildInvoiceItems>[0][number],
  ]);
  expect(items[0].unit_code).toBe("EA");
});
