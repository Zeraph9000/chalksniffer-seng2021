import { buildDespatchAdviceXml } from "@/lib/ubl-despatch-builder";

const ublOrder = {
  id: "order-123",
  issueDate: "2026-04-21",
  orderLines: [
    {
      lineItem: {
        id: "1",
        quantity: 2,
        unitCode: "EA",
        price: { priceAmount: 10, currencyID: "AUD" },
        item: { name: "Cake — Small / Buttercream", sellersItemIdentification: "v-sb", description: "Yum" },
      },
    },
    {
      lineItem: {
        id: "2",
        quantity: 1,
        unitCode: "EA",
        price: { priceAmount: 25, currencyID: "AUD" },
        item: { name: "Sourdough", sellersItemIdentification: "v-sd" },
      },
    },
  ],
};

const buyer = {
  buyerName: "Alice Buyer",
  buyerEmail: "alice@example.com",
  buyerPhone: "+61412345678",
  buyerAddress: { streetName: "1 Test St", cityName: "Sydney", postalZone: "2000", country: "AU" },
};

const seller = {
  sellerCompanyName: "Acme Bakery",
  sellerAbn: "123",
  sellerAddress: { streetName: "48 Mount St", cityName: "Sydney", postalZone: "2036", country: "AU" },
};

test("builds UBL despatch advice XML with correct root + namespaces", () => {
  const xml = buildDespatchAdviceXml({ orderId: "order-123", issueDate: "2026-04-21", ublOrder, buyer, seller });
  expect(xml).toMatch(/^<\?xml/);
  expect(xml).toMatch(/<DespatchAdvice[\s\S]*xmlns="urn:oasis:names:specification:ubl:schema:xsd:DespatchAdvice-2"/);
  expect(xml).toMatch(/xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"/);
  expect(xml).toMatch(/xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"/);
});

test("document-level elements populated from inputs", () => {
  const xml = buildDespatchAdviceXml({ orderId: "order-123", issueDate: "2026-04-21", ublOrder, buyer, seller });
  expect(xml).toMatch(/<cbc:ID>order-123<\/cbc:ID>/);
  expect(xml).toMatch(/<cbc:IssueDate>2026-04-21<\/cbc:IssueDate>/);
  expect(xml).toMatch(/<cbc:CopyIndicator>false<\/cbc:CopyIndicator>/);
  expect(xml).toMatch(/<cac:OrderReference>[\s\S]*<cbc:ID>order-123<\/cbc:ID>/);
});

test("includes one despatch line per UBL order line with matching IDs + quantities", () => {
  const xml = buildDespatchAdviceXml({ orderId: "order-123", issueDate: "2026-04-21", ublOrder, buyer, seller });
  const lines = xml.match(/<cac:DespatchLine>/g) ?? [];
  expect(lines).toHaveLength(2);
  expect(xml).toMatch(/<cbc:DeliveredQuantity unitCode="EA">2<\/cbc:DeliveredQuantity>/);
  expect(xml).toMatch(/<cbc:DeliveredQuantity unitCode="EA">1<\/cbc:DeliveredQuantity>/);
  expect(xml).toMatch(/<cac:SellersItemIdentification><cbc:ID>v-sb<\/cbc:ID><\/cac:SellersItemIdentification>/);
  expect(xml).toMatch(/<cac:SellersItemIdentification><cbc:ID>v-sd<\/cbc:ID><\/cac:SellersItemIdentification>/);
});

test("buyer + seller party blocks populated", () => {
  const xml = buildDespatchAdviceXml({ orderId: "order-123", issueDate: "2026-04-21", ublOrder, buyer, seller });
  expect(xml).toMatch(/<cac:DespatchSupplierParty>[\s\S]*<cbc:Name>Acme Bakery<\/cbc:Name>/);
  expect(xml).toMatch(/<cac:DeliveryCustomerParty>[\s\S]*<cbc:Name>Alice Buyer<\/cbc:Name>/);
  expect(xml).toMatch(/<cbc:StreetName>1 Test St<\/cbc:StreetName>/);
  expect(xml).toMatch(/<cbc:IdentificationCode>AU<\/cbc:IdentificationCode>/);
});

test("escapes XML special characters in free-text fields", () => {
  const nastyUbl = {
    ...ublOrder,
    orderLines: [
      { lineItem: { id: "1", quantity: 1, unitCode: "EA", price: { priceAmount: 1, currencyID: "AUD" },
        item: { name: "Tom & Jerry's \"Special\"", sellersItemIdentification: "v-1" } } },
    ],
  };
  const xml = buildDespatchAdviceXml({ orderId: "o<id>", issueDate: "2026-04-21", ublOrder: nastyUbl, buyer, seller });
  expect(xml).toMatch(/Tom &amp; Jerry&apos;s &quot;Special&quot;/);
  expect(xml).toMatch(/<cbc:ID>o&lt;id&gt;<\/cbc:ID>/);
});
