import mongoose from 'mongoose';
import type {
  Address,
  AllowanceCharge,
  Contact,
  CustomerParty,
  Delivery,
  DeliveryTerms,
  DocumentReference,
  Item,
  LineItem,
  MonetaryTotal,
  Order,
  OrderLine,
  Party,
  PaymentMeans,
  PaymentTerms,
  Period,
  Price,
  SupplierParty,
  TaxCategory,
  TaxSubtotal,
  TaxTotal,
} from '../types';

const periodSchema = new mongoose.Schema<Period>({
  startDate: String,
  endDate: String,
}, { _id: false });

const documentReferenceSchema = new mongoose.Schema<DocumentReference>({
  id: { type: String, required: true },
  documentType: String,
}, { _id: false });

const addressSchema = new mongoose.Schema<Address>({
  streetName: { type: String, required: true },
  additionalStreetName: String,
  buildingNumber: String,
  cityName: { type: String, required: true },
  postalZone: { type: String, required: true },
  countrySubentity: String,
  country: { type: String, required: true },
}, { _id: false });

const contactSchema = new mongoose.Schema<Contact>({
  name: String,
  telephone: String,
  email: String,
}, { _id: false });

const partySchema = new mongoose.Schema<Party>({
  partyName: { type: String, required: true },
  partyIdentification: String,
  postalAddress: { type: addressSchema, required: true },
  contact: contactSchema,
}, { _id: false });

const customerPartySchema = new mongoose.Schema<CustomerParty>({
  party: { type: partySchema, required: true },
}, { _id: false });

const supplierPartySchema = new mongoose.Schema<SupplierParty>({
  party: { type: partySchema, required: true },
}, { _id: false });

const taxCategorySchema = new mongoose.Schema<TaxCategory>({
  percent: Number,
  taxScheme: { type: String, required: true },
}, { _id: false });

const taxSubtotalSchema = new mongoose.Schema<TaxSubtotal>({
  taxableAmount: { type: Number, required: true },
  taxAmount: { type: Number, required: true },
  taxCategory: { type: taxCategorySchema, required: true },
}, { _id: false });

const taxTotalSchema = new mongoose.Schema<TaxTotal>({
  taxAmount: { type: Number, required: true },
  currencyID: { type: String, required: true },
  taxSubtotal: [taxSubtotalSchema],
}, { _id: false });

const monetaryTotalSchema = new mongoose.Schema<MonetaryTotal>({
  lineExtensionAmount: Number,
  taxExclusiveAmount: Number,
  taxInclusiveAmount: Number,
  allowanceTotalAmount: Number,
  chargeTotalAmount: Number,
  payableAmount: Number,
}, { _id: false });

const allowanceChargeSchema = new mongoose.Schema<AllowanceCharge>({
  chargeIndicator: { type: Boolean, required: true },
  allowanceChargeReasonCode: String,
  allowanceChargeReason: String,
  amount: { type: Number, required: true },
  currencyID: { type: String, required: true },
}, { _id: false });

const paymentMeansSchema = new mongoose.Schema<PaymentMeans>({
  paymentMeansCode: { type: String, required: true },
  paymentDueDate: String,
  paymentID: String,
}, { _id: false });

const paymentTermsSchema = new mongoose.Schema<PaymentTerms>({
  note: String,
}, { _id: false });

const deliverySchema = new mongoose.Schema<Delivery>({
  deliveryAddress: addressSchema,
  requestedDeliveryPeriod: periodSchema,
}, { _id: false });

const deliveryTermsSchema = new mongoose.Schema<DeliveryTerms>({
  specialTerms: String,
}, { _id: false });

const priceSchema = new mongoose.Schema<Price>({
  priceAmount: { type: Number, required: true },
  currencyID: { type: String, required: true },
  baseQuantity: Number,
}, { _id: false });

const itemSchema = new mongoose.Schema<Item>({
  name: { type: String, required: true },
  description: String,
  buyersItemIdentification: String,
  sellersItemIdentification: String,
  standardItemIdentification: String,
  classifiedTaxCategory: taxCategorySchema,
}, { _id: false });

const lineItemSchema = new mongoose.Schema<LineItem>({
  id: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitCode: String,
  lineExtensionAmount: Number,
  price: { type: priceSchema, required: true },
  item: { type: itemSchema, required: true },
  delivery: deliverySchema,
}, { _id: false });

const orderLineSchema = new mongoose.Schema<OrderLine>({
  lineItem: { type: lineItemSchema, required: true },
}, { _id: false });

const orderSchema = new mongoose.Schema<Order>({
  id: { type: String, required: true },
  userId: { type: String, required: true },
  salesOrderId: String,
  issueDate: { type: String, required: true },
  issueTime: String,
  orderTypeCode: String,
  note: String,
  documentCurrencyCode: { type: String, required: true },
  pricingCurrencyCode: String,
  taxCurrencyCode: String,
  customerReference: String,
  accountingCostCode: String,
  validityPeriod: periodSchema,
  quotationDocumentReference: documentReferenceSchema,
  orderDocumentReference: documentReferenceSchema,
  originatorDocumentReference: documentReferenceSchema,
  additionalDocumentReference: [documentReferenceSchema],
  buyerCustomerParty: { type: customerPartySchema, required: true },
  sellerSupplierParty: { type: supplierPartySchema, required: true },
  originatorCustomerParty: customerPartySchema,
  delivery: deliverySchema,
  deliveryTerms: deliveryTermsSchema,
  paymentMeans: paymentMeansSchema,
  paymentTerms: paymentTermsSchema,
  allowanceCharge: [allowanceChargeSchema],
  taxTotal: taxTotalSchema,
  anticipatedMonetaryTotal: monetaryTotalSchema,
  orderLines: { type: [orderLineSchema], required: true },
  xmlUrl: String,
}, { timestamps: true });

const OrderModel = mongoose.model<Order>('Order', orderSchema);

export { orderSchema };
export default OrderModel;
