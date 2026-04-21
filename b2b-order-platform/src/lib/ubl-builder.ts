import { Product, Store, UserAddress } from "./types";

export type UblBuildInput = {
  store: Store;
  sellerInfo: { companyName: string; abn: string; address: UserAddress };
  buyer: { name: string; email: string; phone: string; companyName: string | null; abn: string | null; address: UserAddress };
  items: { product: Product; variantId: string; qty: number; unitPriceSnapshot: number }[];
  note?: string;
  issueDate: string;
};

export type UblOrder = {
  issueDate: string;
  documentCurrencyCode: string;
  note?: string;
  buyerCustomerParty: { party: { partyName: string; partyIdentification?: string; postalAddress: UserAddress; contact?: { email: string; telephone: string } } };
  sellerSupplierParty: { party: { partyName: string; partyIdentification?: string; postalAddress: UserAddress } };
  orderLines: {
    lineItem: {
      id: string;
      quantity: number;
      unitCode: string;
      price: { priceAmount: number; currencyID: string };
      item: { name: string; description?: string; sellersItemIdentification: string };
    };
  }[];
};

function variantLabel(product: Product, variantId: string): string {
  const v = product.variants.find(x => x.variantId === variantId);
  if (!v) return product.name;
  const pairs = product.options.map(opt => v.optionValues[opt.name]).filter(Boolean);
  return pairs.length > 0 ? `${product.name} — ${pairs.join(" / ")}` : product.name;
}

/**
 * Build a UBL 2.4 Order payload from cart + buyer + store context.
 * Line items flatten variant option values into `item.name` (e.g. "Cake — S / Red")
 * and carry `variantId` as `sellersItemIdentification` for unique line identity.
 */
export function buildUblOrder(input: UblBuildInput): UblOrder {
  const currency = input.items[0]?.product.currency || "AUD";
  return {
    issueDate: input.issueDate,
    documentCurrencyCode: currency,
    note: input.note,
    buyerCustomerParty: {
      party: {
        partyName: input.buyer.companyName || input.buyer.name,
        partyIdentification: input.buyer.abn ?? undefined,
        postalAddress: input.buyer.address,
        contact: { email: input.buyer.email, telephone: input.buyer.phone },
      },
    },
    sellerSupplierParty: {
      party: {
        partyName: input.sellerInfo.companyName,
        partyIdentification: input.sellerInfo.abn,
        postalAddress: input.sellerInfo.address,
      },
    },
    orderLines: input.items.map((it, idx) => ({
      lineItem: {
        id: String(idx + 1),
        quantity: it.qty,
        unitCode: it.product.unitCode,
        price: { priceAmount: it.unitPriceSnapshot, currencyID: it.product.currency },
        item: {
          name: variantLabel(it.product, it.variantId),
          description: it.product.description || undefined,
          sellersItemIdentification: it.variantId,
        },
      },
    })),
  };
}
