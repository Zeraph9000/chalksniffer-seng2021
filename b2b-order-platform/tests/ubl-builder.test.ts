import { buildUblOrder } from "@/lib/ubl-builder";
import type { Product, Store } from "@/lib/types";

const store: Store = {
  storeId: "s1", userId: "seller1", storeName: "Acme Bakery", description: "d",
  status: "active", location: "Sydney", category: "bakery",
  createdAt: new Date(), updatedAt: new Date(),
};

const product: Product = {
  productId: "p1", storeId: "s1", name: "Cake", description: "",
  category: "bakery", imageUrl: "", unitCode: "each", currency: "AUD",
  available: true,
  options: [{ name: "Size", values: ["S", "M"] }],
  variants: [{ variantId: "v-s", optionValues: { Size: "S" }, price: 10, stock: 10 }],
  createdAt: new Date(), updatedAt: new Date(),
};

test("buildUblOrder produces valid UBL with variant in item name", () => {
  const ubl = buildUblOrder({
    store,
    sellerInfo: { companyName: "Acme Bakery Pty Ltd", abn: "123", address: { streetName: "1 Main", cityName: "Sydney", postalZone: "2000", country: "AU" } },
    buyer: { name: "Alice", email: "alice@example.com", phone: "+1", companyName: null, abn: null, address: { streetName: "2 Side", cityName: "Melbourne", postalZone: "3000", country: "AU" } },
    items: [{ product, variantId: "v-s", qty: 2, unitPriceSnapshot: 10 }],
    note: "leave at door",
    issueDate: "2026-04-21",
  });

  expect(ubl.orderLines[0].lineItem.item.name).toBe("Cake — S");
  expect(ubl.orderLines[0].lineItem.item.sellersItemIdentification).toBe("v-s");
  expect(ubl.orderLines[0].lineItem.quantity).toBe(2);
  expect(ubl.orderLines[0].lineItem.price.priceAmount).toBe(10);
  expect(ubl.documentCurrencyCode).toBe("AUD");
  expect(ubl.buyerCustomerParty.party.partyName).toBe("Alice");
  expect(ubl.sellerSupplierParty.party.partyName).toBe("Acme Bakery Pty Ltd");
});
