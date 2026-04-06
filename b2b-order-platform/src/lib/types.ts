// ============================================
// Session
// ============================================

export type UserRole = "buyer" | "seller";

export type SessionData = {
  role: UserRole;
  name: string;
  chalksniffer: { apiKey: string };
  despatch: { sessionId: string; clientId: string };
  lastminutepush: { apiKey: string };
};

export type User = {
  _id?: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  chalksniffer: { apiKey: string };
  despatch: { sessionId: string; clientId: string };
  lastminutepush: { apiKey: string };
  createdAt: Date;
};

// ============================================
// Chalksniffer API Types
// ============================================

export type Address = {
  streetName: string;
  additionalStreetName?: string | null;
  buildingNumber?: string | null;
  cityName: string;
  postalZone: string;
  countrySubentity?: string | null;
  country: string;
};

export type Contact = {
  name?: string | null;
  telephone?: string | null;
  email?: string | null;
};

export type Party = {
  partyName: string;
  partyIdentification?: string | null;
  postalAddress: Address;
  contact?: Contact | null;
};

export type CustomerParty = {
  party: Party;
};

export type SupplierParty = {
  party: Party;
};

export type Period = {
  startDate?: string | null;
  endDate?: string | null;
};

export type DocumentReference = {
  id: string;
  documentType?: string | null;
};

export type TaxCategory = {
  percent?: number | null;
  taxScheme: string;
};

export type TaxSubtotal = {
  taxableAmount: number;
  taxAmount: number;
  taxCategory: TaxCategory;
};

export type TaxTotal = {
  taxAmount: number;
  currencyID: string;
  taxSubtotal?: TaxSubtotal[] | null;
};

export type MonetaryTotal = {
  lineExtensionAmount?: number | null;
  taxExclusiveAmount?: number | null;
  taxInclusiveAmount?: number | null;
  allowanceTotalAmount?: number | null;
  chargeTotalAmount?: number | null;
  payableAmount?: number | null;
};

export type AllowanceCharge = {
  chargeIndicator: boolean;
  allowanceChargeReasonCode?: string | null;
  allowanceChargeReason?: string | null;
  amount: number;
  currencyID: string;
};

export type PaymentMeans = {
  paymentMeansCode: string;
  paymentDueDate?: string | null;
  paymentID?: string | null;
};

export type PaymentTerms = {
  note?: string | null;
};

export type Delivery = {
  deliveryAddress?: Address | null;
  requestedDeliveryPeriod?: Period | null;
};

export type DeliveryTerms = {
  specialTerms?: string | null;
};

export type Price = {
  priceAmount: number;
  currencyID: string;
  baseQuantity?: number | null;
};

export type Item = {
  name: string;
  description?: string | null;
  buyersItemIdentification?: string | null;
  sellersItemIdentification?: string | null;
  standardItemIdentification?: string | null;
  classifiedTaxCategory?: TaxCategory | null;
};

export type LineItem = {
  id: string;
  quantity: number;
  unitCode?: string | null;
  lineExtensionAmount?: number | null;
  price: Price;
  item: Item;
  delivery?: Delivery | null;
};

export type OrderLine = {
  lineItem: LineItem;
};

export type Order = {
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
  createdAt?: string | null;
  updatedAt?: string | null;
  xmlUrl?: string | null;
};

export type OrderPaginated = {
  id: string;
  issueDate: string;
  buyerName: string;
  sellerName: string;
  payableAmount: number | string;
  documentCurrencyCode: string;
  createdAt: string;
};

export type OrderListResponse = {
  orders: OrderPaginated[];
  limit: number;
  offset: number;
  totalOrders: number;
};

export type Frequency = "Daily" | "Weekly" | "Monthly";

export type RecurringOrderInstance = {
  id: string;
  order: Order;
  scheduledDate: string;
};

export type RecurringOrder = {
  id: string;
  userId: string;
  order: Order;
  frequency: Frequency;
  startDate: string;
  orderInstances: RecurringOrderInstance[];
  createdAt?: string;
  updatedAt?: string;
};

// ============================================
// Despatch & Order Management API Types
// ============================================

export type DespatchParty = {
  name: string;
  postalAddress: {
    streetName: string;
    buildingName?: string;
    buildingNumber?: string;
    cityName: string;
    postalZone: string;
    countrySubentity?: string;
    addressLine?: string;
    countryIdentificationCode: string;
  };
  contact?: {
    name?: string;
    telephone?: string;
    telefax?: string;
    email?: string;
  };
};

export type DespatchSupplierParty = {
  customerAssignedAccountId?: string;
  party: DespatchParty;
};

export type DeliveryCustomerParty = {
  customerAssignedAccountId?: string;
  supplierAssignedAccountId?: string;
  party: DespatchParty;
};

export type DespatchDeliveryPeriod = {
  startDate: string;
  startTime?: string;
  endDate: string;
  endTime?: string;
};

export type DespatchShipment = {
  id: string;
  consignmentId: string;
  delivery: {
    id?: string;
    deliveryAddress: DespatchParty["postalAddress"];
    requestedDeliveryPeriod: DespatchDeliveryPeriod;
  };
};

export type DespatchOrderReference = {
  id: string;
  salesOrderId?: string;
  uuid?: string;
  issueDate?: string;
};

export type DespatchItem = {
  description: string;
  name: string;
  buyersItemIdentification?: { id: string };
  sellersItemIdentification?: { id: string };
  itemInstance?: {
    lotIdentification?: {
      lotNumberId?: string;
      expiryDate?: string;
    };
  };
};

export type DespatchLine = {
  id: string;
  note?: string;
  lineStatusCode?: string;
  deliveredQuantity: number;
  deliveredQuantityUnitCode: string;
  backorderQuantity?: number;
  backorderQuantityUnitCode?: string;
  backorderReason?: string;
  orderLineReference: {
    lineId: string;
    salesOrderLineId?: string;
    orderReference: DespatchOrderReference;
  };
  item: DespatchItem;
};

export type DespatchAdviceCreate = {
  documentID: string;
  senderId: string;
  receiverId: string;
  copyIndicator: boolean;
  replaces?: string;
  issueDate: string;
  documentStatusCode: string;
  orderReference: DespatchOrderReference;
  despatchAdviceTypeCode?: string;
  note?: string;
  despatchSupplierParty: DespatchSupplierParty;
  deliveryCustomerParty: DeliveryCustomerParty;
  shipment: DespatchShipment;
  despatchLines: DespatchLine[];
};

export type DespatchAdvice = DespatchAdviceCreate & {
  uuid: string;
  status: "DESPATCHED" | "RECEIVED" | "FULFILMENT_CANCELLED";
};

export type ReceiptLine = {
  id: string;
  note?: string;
  receivedQuantity: number;
  receivedQuantityUnitCode: string;
  shortQuantity?: number;
  shortQuantityUnitCode?: string;
  item: DespatchItem;
};

export type ReceiptAdviceCreate = {
  documentID: string;
  senderId: string;
  receiverId: string;
  copyIndicator: boolean;
  issueDate?: string;
  documentStatusCode: string;
  note?: string;
  orderReference: DespatchOrderReference;
  despatchDocumentReference?: { id: string; uuid?: string; issueDate?: string };
  deliveryCustomerParty: DeliveryCustomerParty;
  despatchSupplierParty: DespatchSupplierParty;
  shipment: {
    id: string;
    consignmentId: string;
    delivery: {
      id?: string;
      quantity?: number;
      quantityUnitCode?: string;
      actualDeliveryDate?: string;
      actualDeliveryTime?: string;
      requestedDeliveryPeriod?: DespatchDeliveryPeriod;
    };
  };
  receiptLines: ReceiptLine[];
};

export type OrderChange = {
  id?: string;
  issueDate: string;
  orderReferenceId: string;
  changesMade: string;
  buyer: DespatchParty;
  seller: DespatchParty;
};

export type OrderCancellation = {
  cancellationId?: string;
  documentType: string;
  documentId: string;
  reason: string;
  status?: "pending" | "approved" | "rejected";
  cancelledByUserId?: string;
  cancelledAt?: string;
};

export type FulfilmentCancellation = {
  receiverId: string;
  submitterId: string;
  documentId: string;
  issueDate: string;
  note?: string;
  shipment: DespatchShipment;
};

// ============================================
// LastMinutePush Invoice API Types
// ============================================

// Input type for create/update requests
export type InvoiceItemInput = {
  name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  unit_code: string;
};

// Response type — includes computed line_total
export type InvoiceItem = {
  name: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  unit_code: string;
  line_total: number;
};

export type SupplierInfo = {
  name: string;
  identifier: string;
};

export type CustomerInfo = {
  name: string | null;
  identifier: string;
};

export type InvoiceCreate = {
  invoice_id?: string;
  order_reference: string;
  customer_id: string;
  status?: "draft" | "sent" | "paid";
  issue_date?: string;
  due_date?: string | null;
  currency?: string;
  supplier?: { name?: string | null; identifier?: string | null };
  customer?: { name?: string | null; identifier?: string | null };
  items: InvoiceItemInput[];
};

export type InvoiceSummary = {
  invoice_id: string;
  status: "draft" | "sent" | "paid";
  order_reference: string;
  customer_id: string;
  created_at: string;
  updated_at: string | null;
  issue_date: string | null;
  due_date: string | null;
  currency: string;
  subtotal: number;
  tax_exclusive_amount: number;
  tax_inclusive_amount: number;
  payable_amount: number;
  payment_date: string | null;
};

export type InvoiceDetail = InvoiceSummary & {
  supplier: SupplierInfo;
  customer: CustomerInfo;
  items: InvoiceItem[];
};

// ============================================
// Cross-API Order Linking
// ============================================

export type OrderLink = {
  orderId: string;
  despatchDocumentId?: string;
  receiptAdviceId?: string;
  invoiceId?: string;
  status: "placed" | "despatched" | "received" | "invoiced";
};
