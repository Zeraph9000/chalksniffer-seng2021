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

type UblOrder = {
  id?: string;
  issueDate?: string;
  orderLines: UblOrderLine[];
};

export type DespatchAdviceBuildInput = {
  orderId: string;
  issueDate: string;
  ublOrder: UblOrder;
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
 * Build a minimal-but-valid UBL 2.1 Despatch Advice XML document from a Chalksniffer UBL Order
 * plus buyer/seller context. Conforms to urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2.
 */
export function buildDespatchAdviceXml(input: DespatchAdviceBuildInput): string {
  const { orderId, issueDate, ublOrder, buyer, seller } = input;

  const despatchLines = ublOrder.orderLines
    .map((ol, i) => {
      const li = ol.lineItem;
      const unit = li.unitCode || "EA";
      return (
        `<cac:DespatchLine>`
        + `<cbc:ID>${esc(li.id || String(i + 1))}</cbc:ID>`
        + `<cbc:DeliveredQuantity unitCode="${esc(unit)}">${esc(li.quantity)}</cbc:DeliveredQuantity>`
        + `<cac:OrderLineReference><cbc:LineID>${esc(li.id || String(i + 1))}</cbc:LineID></cac:OrderLineReference>`
        + `<cac:Item>`
        + `<cbc:Name>${esc(li.item.name)}</cbc:Name>`
        + (li.item.description ? `<cbc:Description>${esc(li.item.description)}</cbc:Description>` : "")
        + (li.item.sellersItemIdentification
          ? `<cac:SellersItemIdentification><cbc:ID>${esc(li.item.sellersItemIdentification)}</cbc:ID></cac:SellersItemIdentification>`
          : "")
        + `</cac:Item>`
        + `</cac:DespatchLine>`
      );
    })
    .join("");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>`
    + `<DespatchAdvice`
    + ` xmlns="urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2"`
    + ` xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"`
    + ` xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">`
    + `<cbc:UBLVersionID>2.1</cbc:UBLVersionID>`
    + `<cbc:ID>${esc(orderId)}</cbc:ID>`
    + `<cbc:CopyIndicator>false</cbc:CopyIndicator>`
    + `<cbc:IssueDate>${esc(issueDate)}</cbc:IssueDate>`
    + `<cbc:DocumentStatusCode>NoStatus</cbc:DocumentStatusCode>`
    + `<cac:OrderReference>`
    + `<cbc:ID>${esc(orderId)}</cbc:ID>`
    + (ublOrder.issueDate ? `<cbc:IssueDate>${esc(ublOrder.issueDate)}</cbc:IssueDate>` : "")
    + `</cac:OrderReference>`
    + `<cac:DespatchSupplierParty>`
    + `<cac:Party>`
    + `<cac:PartyName><cbc:Name>${esc(seller.sellerCompanyName)}</cbc:Name></cac:PartyName>`
    + (seller.sellerAbn ? `<cac:PartyIdentification><cbc:ID>${esc(seller.sellerAbn)}</cbc:ID></cac:PartyIdentification>` : "")
    + `<cac:PostalAddress>${addressXml(seller.sellerAddress)}</cac:PostalAddress>`
    + `</cac:Party>`
    + `</cac:DespatchSupplierParty>`
    + `<cac:DeliveryCustomerParty>`
    + `<cac:Party>`
    + `<cac:PartyName><cbc:Name>${esc(buyer.buyerName)}</cbc:Name></cac:PartyName>`
    + `<cac:PostalAddress>${addressXml(buyer.buyerAddress)}</cac:PostalAddress>`
    + `<cac:Contact>`
    + `<cbc:Telephone>${esc(buyer.buyerPhone)}</cbc:Telephone>`
    + `<cbc:ElectronicMail>${esc(buyer.buyerEmail)}</cbc:ElectronicMail>`
    + `</cac:Contact>`
    + `</cac:Party>`
    + `</cac:DeliveryCustomerParty>`
    + `<cac:Shipment>`
    + `<cbc:ID>${esc(orderId)}</cbc:ID>`
    + `<cac:Consignment><cbc:ID>${esc(orderId)}</cbc:ID></cac:Consignment>`
    + `<cac:Delivery><cac:DeliveryAddress>${addressXml(buyer.buyerAddress)}</cac:DeliveryAddress></cac:Delivery>`
    + `</cac:Shipment>`
    + despatchLines
    + `</DespatchAdvice>`
  );
}
