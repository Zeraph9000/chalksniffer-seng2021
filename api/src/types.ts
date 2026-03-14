type Period = {
  startDate?: string;
  endDate?: string;
};

type DocumentReference = {
  id: string;
  documentType?: string;
};

type Address = {
  streetName: string;
  additionalStreetName?: string;
  buildingNumber?: string;
  cityName: string;
  postalZone: string;
  countrySubentity?: string;
  country: string;
};

type Contact = {
  name?: string;
  telephone?: string;
  email?: string;
};

type Party = {
  partyName: string;
  partyIdentification?: string;
  postalAddress: Address;
  contact?: Contact;
};

type CustomerParty = {
  party: Party;
};

type SupplierParty = {
  party: Party;
};

type TaxCategory = {
  percent?: number;
  taxScheme: string;
};

type TaxSubtotal = {
  taxableAmount: number;
  taxAmount: number;
  taxCategory: TaxCategory;
};

type TaxTotal = {
  taxAmount: number;
  currencyID: string;
  taxSubtotal?: TaxSubtotal[];
};

type MonetaryTotal = {
  lineExtensionAmount?: number;
  taxExclusiveAmount?: number;
  taxInclusiveAmount?: number;
  allowanceTotalAmount?: number;
  chargeTotalAmount?: number;
  payableAmount?: number;
};

type AllowanceCharge = {
  chargeIndicator: boolean;
  allowanceChargeReasonCode?: string;
  allowanceChargeReason?: string;
  amount: number;
  currencyID: string;
};

type PaymentMeans = {
  paymentMeansCode: string;
  paymentDueDate?: string;
  paymentID?: string;
};

type PaymentTerms = {
  note?: string;
};

type Delivery = {
  deliveryAddress?: Address;
  requestedDeliveryPeriod?: Period;
};

type DeliveryTerms = {
  specialTerms?: string;
};

type Price = {
  priceAmount: number;
  currencyID: string;
  baseQuantity?: number;
};

type Item = {
  name: string;
  description?: string;
  buyersItemIdentification?: string;
  sellersItemIdentification?: string;
  standardItemIdentification?: string;
  classifiedTaxCategory?: TaxCategory;
};

type LineItem = {
  id: string;
  quantity: number;
  unitCode?: string;
  lineExtensionAmount?: number;
  price: Price;
  item: Item;
  delivery?: Delivery;
};

type OrderLine = {
  lineItem: LineItem;
};

type Order = {
  id: string;
  salesOrderId?: string;
  issueDate: string;
  issueTime?: string;
  orderTypeCode?: string;
  note?: string;
  documentCurrencyCode: string;
  pricingCurrencyCode?: string;
  taxCurrencyCode?: string;
  customerReference?: string;
  accountingCostCode?: string;
  validityPeriod?: Period;
  quotationDocumentReference?: DocumentReference;
  orderDocumentReference?: DocumentReference;
  originatorDocumentReference?: DocumentReference;
  additionalDocumentReference?: DocumentReference[];
  buyerCustomerParty: CustomerParty;
  sellerSupplierParty: SupplierParty;
  originatorCustomerParty?: CustomerParty;
  delivery?: Delivery;
  deliveryTerms?: DeliveryTerms;
  paymentMeans?: PaymentMeans;
  paymentTerms?: PaymentTerms;
  allowanceCharge?: AllowanceCharge[];
  taxTotal?: TaxTotal;
  anticipatedMonetaryTotal?: MonetaryTotal;
  orderLines: OrderLine[];
  createdAt?: string;
  updatedAt?: string;
  xmlUrl?: string;
};

type OrderResponse = {
  id: string;
  issueDate: string;
  documentCurrencyCode: string;
  buyerCustomerParty: CustomerParty;
  sellerSupplierParty: SupplierParty;
  orderLines: OrderLine[];
  anticipatedMonetaryTotal: MonetaryTotal;
  createdAt: Date;
  xmlUrl: string;
}


export type {
  Period,
  DocumentReference,
  Address,
  Contact,
  Party,
  CustomerParty,
  SupplierParty,
  TaxCategory,
  TaxSubtotal,
  TaxTotal,
  MonetaryTotal,
  AllowanceCharge,
  PaymentMeans,
  PaymentTerms,
  Delivery,
  DeliveryTerms,
  Price,
  Item,
  LineItem,
  OrderLine,
  Order,
  OrderResponse,
};
