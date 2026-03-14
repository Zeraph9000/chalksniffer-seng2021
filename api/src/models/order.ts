import mongoose from 'mongoose';

const periodSchema = new mongoose.Schema({
  startDate: String,
  endDate: String,
}, { _id: false });

const documentReferenceSchema = new mongoose.Schema({
  id: { type: String, required: true },
  documentType: String,
}, { _id: false });

const addressSchema = new mongoose.Schema({
  streetName: { type: String, required: true },
  additionalStreetName: String,
  buildingNumber: String,
  cityName: { type: String, required: true },
  postalZone: { type: String, required: true },
  countrySubentity: String,
  country: { type: String, required: true },
}, { _id: false });

const contactSchema = new mongoose.Schema({
  name: String,
  telephone: String,
  email: String,
}, { _id: false });

const partySchema = new mongoose.Schema({
  partyName: { type: String, required: true },
  partyIdentification: String,
  postalAddress: { type: addressSchema, required: true },
  contact: contactSchema,
}, { _id: false });

const customerPartySchema = new mongoose.Schema({
  party: { type: partySchema, required: true },
}, { _id: false });

const supplierPartySchema = new mongoose.Schema({
  party: { type: partySchema, required: true },
}, { _id: false });

const taxCategorySchema = new mongoose.Schema({
  percent: Number,
  taxScheme: { type: String, required: true },
}, { _id: false });

const taxSubtotalSchema = new mongoose.Schema({
  taxableAmount: { type: Number, required: true },
  taxAmount: { type: Number, required: true },
  taxCategory: { type: taxCategorySchema, required: true },
}, { _id: false });

const taxTotalSchema = new mongoose.Schema({
  taxAmount: { type: Number, required: true },
  currencyID: { type: String, required: true },
  taxSubtotal: [taxSubtotalSchema],
}, { _id: false });

const monetaryTotalSchema = new mongoose.Schema({
  lineExtensionAmount: Number,
  taxExclusiveAmount: Number,
  taxInclusiveAmount: Number,
  allowanceTotalAmount: Number,
  chargeTotalAmount: Number,
  payableAmount: Number,
}, { _id: false });

const allowanceChargeSchema = new mongoose.Schema({
  chargeIndicator: { type: Boolean, required: true },
  allowanceChargeReasonCode: String,
  allowanceChargeReason: String,
  amount: { type: Number, required: true },
  currencyID: { type: String, required: true },
}, { _id: false });

const paymentMeansSchema = new mongoose.Schema({
  paymentMeansCode: { type: String, required: true },
  paymentDueDate: String,
  paymentID: String,
}, { _id: false });

const paymentTermsSchema = new mongoose.Schema({
  note: String,
}, { _id: false });

const deliverySchema = new mongoose.Schema({
  deliveryAddress: addressSchema,
  requestedDeliveryPeriod: periodSchema,
}, { _id: false });

const deliveryTermsSchema = new mongoose.Schema({
  specialTerms: String,
}, { _id: false });

const priceSchema = new mongoose.Schema({
  priceAmount: { type: Number, required: true },
  currencyID: { type: String, required: true },
  baseQuantity: Number,
}, { _id: false });

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  buyersItemIdentification: String,
  sellersItemIdentification: String,
  standardItemIdentification: String,
  classifiedTaxCategory: taxCategorySchema,
}, { _id: false });

const lineItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitCode: String,
  lineExtensionAmount: Number,
  price: { type: priceSchema, required: true },
  item: { type: itemSchema, required: true },
  delivery: deliverySchema,
}, { _id: false });

const orderLineSchema = new mongoose.Schema({
  lineItem: { type: lineItemSchema, required: true },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  id: { type: String, required: true },
  salesOrderId: { type: String, default: undefined },
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

const OrderModel = mongoose.model('Order', orderSchema);

export { orderSchema };
export default OrderModel;
