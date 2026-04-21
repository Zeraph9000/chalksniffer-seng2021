import type { UserAddress } from "./types";

type UblOrderLine = {
  lineItem: {
    id: string;
    quantity: number;
    unitCode?: string;
    price: { priceAmount: number; currencyID: string };
    item: { name: string; description?: string; sellersItemIdentification?: string };
  };
};

export type UblOrderJson = {
  id?: string;
  issueDate?: string;
  documentCurrencyCode?: string;
  orderLines: UblOrderLine[];
};

export type UblOrderBuildInput = {
  orderId: string;
  issueDate: string;
  order: UblOrderJson;
  buyer: {
    buyerName: string;
    buyerEmail: string;
    buyerPhone: string;
    buyerAddress: UserAddress;
  };
  seller: {
    sellerCompanyName: string;
    sellerAbn?: string;
    sellerAddress: UserAddress;
  };
};

function esc(s: string | number | undefined | null): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function addressXml(a: UserAddress): string {
  return [
    `<cbc:StreetName>${esc(a.streetName)}</cbc:StreetName>`,
    `<cbc:CityName>${esc(a.cityName)}</cbc:CityName>`,
    `<cbc:PostalZone>${esc(a.postalZone)}</cbc:PostalZone>`,
    `<cac:Country><cbc:IdentificationCode>${esc(a.country)}</cbc:IdentificationCode></cac:Country>`,
  ].join("");
}

/**
 * Build a properly-namespaced UBL 2.1 Order XML document. Used when forwarding
 * to DevEx Despatch V2, which validates against strict UBL schema and rejects
 * the non-standard XML that Chalksniffer currently emits.
 */
export function buildUblOrderXml(input: UblOrderBuildInput): string {
  const { orderId, issueDate, order, buyer, seller } = input;
  const currency = order.documentCurrencyCode || "AUD";

  const orderLines = order.orderLines
    .map((ol, i) => {
      const li = ol.lineItem;
      const unit = li.unitCode || "EA";
      return (
        `<cac:OrderLine>`
        + `<cac:LineItem>`
        + `<cbc:ID>${esc(li.id || String(i + 1))}</cbc:ID>`
        + `<cbc:Quantity unitCode="${esc(unit)}">${esc(li.quantity)}</cbc:Quantity>`
        + `<cbc:LineExtensionAmount currencyID="${esc(li.price.currencyID)}">${esc(li.quantity * li.price.priceAmount)}</cbc:LineExtensionAmount>`
        + `<cac:Price>`
        + `<cbc:PriceAmount currencyID="${esc(li.price.currencyID)}">${esc(li.price.priceAmount)}</cbc:PriceAmount>`
        + `</cac:Price>`
        + `<cac:Item>`
        + `<cbc:Name>${esc(li.item.name)}</cbc:Name>`
        + (li.item.description ? `<cbc:Description>${esc(li.item.description)}</cbc:Description>` : "")
        + (li.item.sellersItemIdentification
          ? `<cac:SellersItemIdentification><cbc:ID>${esc(li.item.sellersItemIdentification)}</cbc:ID></cac:SellersItemIdentification>`
          : "")
        + `</cac:Item>`
        + `</cac:LineItem>`
        + `</cac:OrderLine>`
      );
    })
    .join("");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>`
    + `<Order`
    + ` xmlns="urn:oasis:names:specification:ubl:schema:xsd:Order-2"`
    + ` xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"`
    + ` xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">`
    + `<cbc:UBLVersionID>2.1</cbc:UBLVersionID>`
    + `<cbc:ID>${esc(orderId)}</cbc:ID>`
    + `<cbc:IssueDate>${esc(issueDate)}</cbc:IssueDate>`
    + `<cbc:DocumentCurrencyCode>${esc(currency)}</cbc:DocumentCurrencyCode>`
    + `<cac:BuyerCustomerParty>`
    + `<cac:Party>`
    + `<cac:PartyName><cbc:Name>${esc(buyer.buyerName)}</cbc:Name></cac:PartyName>`
    + `<cac:PostalAddress>${addressXml(buyer.buyerAddress)}</cac:PostalAddress>`
    + `<cac:Contact>`
    + `<cbc:Telephone>${esc(buyer.buyerPhone)}</cbc:Telephone>`
    + `<cbc:ElectronicMail>${esc(buyer.buyerEmail)}</cbc:ElectronicMail>`
    + `</cac:Contact>`
    + `</cac:Party>`
    + `</cac:BuyerCustomerParty>`
    + `<cac:SellerSupplierParty>`
    + `<cac:Party>`
    + `<cac:PartyName><cbc:Name>${esc(seller.sellerCompanyName)}</cbc:Name></cac:PartyName>`
    + (seller.sellerAbn ? `<cac:PartyIdentification><cbc:ID>${esc(seller.sellerAbn)}</cbc:ID></cac:PartyIdentification>` : "")
    + `<cac:PostalAddress>${addressXml(seller.sellerAddress)}</cac:PostalAddress>`
    + `</cac:Party>`
    + `</cac:SellerSupplierParty>`
    + `<cac:Delivery>`
    + `<cac:DeliveryAddress>${addressXml(buyer.buyerAddress)}</cac:DeliveryAddress>`
    + `</cac:Delivery>`
    + orderLines
    + `</Order>`
  );
}
