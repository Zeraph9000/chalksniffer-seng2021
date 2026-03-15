type Period = {
  startDate?: string | null;
  endDate?: string | null;
};

type DocumentReference = {
  id: string;
  documentType?: string | null;
};

type Address = {
  streetName: string;
  additionalStreetName?: string | null;
  buildingNumber?: string | null;
  cityName: string;
  postalZone: string;
  countrySubentity?: string | null;
  country: string;
};

type Contact = {
  name?: string | null;
  telephone?: string | null;
  email?: string | null;
};

type Party = {
  partyName: string;
  partyIdentification?: string | null;
  postalAddress: Address;
  contact?: Contact | null;
};

type CustomerParty = {
  party: Party;
};

type SupplierParty = {
  party: Party;
};

type TaxCategory = {
  percent?: number | null;
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
  taxSubtotal?: TaxSubtotal[] | null;
};

type MonetaryTotal = {
  lineExtensionAmount?: number | null;
  taxExclusiveAmount?: number | null;
  taxInclusiveAmount?: number | null;
  allowanceTotalAmount?: number | null;
  chargeTotalAmount?: number | null;
  payableAmount?: number | null;
};

type AllowanceCharge = {
  chargeIndicator: boolean;
  allowanceChargeReasonCode?: string | null;
  allowanceChargeReason?: string | null;
  amount: number;
  currencyID: string;
};

type PaymentMeans = {
  paymentMeansCode: string;
  paymentDueDate?: string | null;
  paymentID?: string | null;
};

type PaymentTerms = {
  note?: string | null;
};

type Delivery = {
  deliveryAddress?: Address | null;
  requestedDeliveryPeriod?: Period | null;
};

type DeliveryTerms = {
  specialTerms?: string | null;
};

type Price = {
  priceAmount: number;
  currencyID: string;
  baseQuantity?: number | null;
};

type Item = {
  name: string;
  description?: string | null;
  buyersItemIdentification?: string | null;
  sellersItemIdentification?: string | null;
  standardItemIdentification?: string | null;
  classifiedTaxCategory?: TaxCategory | null;
};

type LineItem = {
  id: string;
  quantity: number;
  unitCode?: string | null;
  lineExtensionAmount?: number | null;
  price: Price;
  item: Item;
  delivery?: Delivery | null;
};

type OrderLine = {
  lineItem: LineItem;
};

type Order = {
  id: string;
  userId: string;
  salesOrderId?: string;
  issueDate: string;
  issueTime?: string | null;
  orderTypeCode?: string | null;
  note?: string | null;
  documentCurrencyCode: string;
  pricingCurrencyCode?: string | null;
  taxCurrencyCode?: string | null;
  customerReference?: string | null;
  accountingCostCode?: string | null;
  validityPeriod?: Period | null;
  quotationDocumentReference?: DocumentReference | null;
  orderDocumentReference?: DocumentReference | null;
  originatorDocumentReference?: DocumentReference | null;
  additionalDocumentReference?: DocumentReference[] | null;
  buyerCustomerParty: CustomerParty;
  sellerSupplierParty: SupplierParty;
  originatorCustomerParty?: CustomerParty | null;
  delivery?: Delivery | null;
  deliveryTerms?: DeliveryTerms | null;
  paymentMeans?: PaymentMeans | null;
  paymentTerms?: PaymentTerms | null;
  allowanceCharge?: AllowanceCharge[] | null;
  taxTotal?: TaxTotal | null;
  anticipatedMonetaryTotal?: MonetaryTotal | null;
  orderLines: OrderLine[];
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  xmlUrl?: string | null;
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
};

type editOrderFmt = {
  note?: string | null;
  delivery?: Delivery | null;
  orderLines?: OrderLine[] | null;
};

type Frequency = 'Daily' | 'Weekly' | 'Monthly';

type RecurringOrderInstance = {
  order: Order;
  scheduledDate: string;
};

type RecurringOrder = {
  id: string;
  userId: string;
  order: Order;
  frequency: Frequency;
  startDate: string;
  orderInstances: RecurringOrderInstance[];
  createdAt?: string;
  updatedAt?: string;
};

type RecurringOrderResponse = {
  id: string;
  frequency: Frequency;
  startDate: string;
  createdAt: Date;
};

type OrderPaginated = {
  id: string;
  issueDate: string;
  buyerName: string;
  sellerName: string;
  payableAmount: number;
  documentCurrencyCode: string;
  createdAt: string | Date | null | undefined;
}

type OrderFilter = {
  userId?: string | null;
  id?: string;
  issueDate?: string;
  buyerName?: string;
  sellerName?: string;
  payableAmount?: number;
  documentCurrencyCode?: string;
  createdAt?: string;
}

type OrderList = {
  orders: OrderPaginated[];
  limit: number;
  totalOrders: number;
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
  editOrderFmt,
  Frequency,
  RecurringOrderInstance,
  RecurringOrder,
  RecurringOrderResponse,
  OrderPaginated,
  OrderFilter,
  OrderList,
};
