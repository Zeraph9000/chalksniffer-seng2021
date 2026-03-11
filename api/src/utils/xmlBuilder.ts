import { XMLBuilder } from 'fast-xml-parser';
import type { Order } from '../types';

const builder = new XMLBuilder({
  ignoreAttributes: false,
  format: true,
  suppressEmptyNode: true,
});

export function buildOrderXml(order: Order): string {
  const orderObj: Record<string, unknown> = {
    '@_xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Order-2',
    'ID': order.id,
    'SalesOrderID': order.salesOrderId,
    'IssueDate': order.issueDate,
    'IssueTime': order.issueTime,
    'OrderTypeCode': order.orderTypeCode,
    'Note': order.note,
    'DocumentCurrencyCode': order.documentCurrencyCode,
    'PricingCurrencyCode': order.pricingCurrencyCode,
    'TaxCurrencyCode': order.taxCurrencyCode,
    'CustomerReference': order.customerReference,
    'AccountingCostCode': order.accountingCostCode,
    'ValidityPeriod': order.validityPeriod,
    'QuotationDocumentReference': order.quotationDocumentReference,
    'OrderDocumentReference': order.orderDocumentReference,
    'OriginatorDocumentReference': order.originatorDocumentReference,
    'AdditionalDocumentReference': order.additionalDocumentReference,
    'BuyerCustomerParty': order.buyerCustomerParty,
    'SellerSupplierParty': order.sellerSupplierParty,
    'OriginatorCustomerParty': order.originatorCustomerParty,
    'Delivery': order.delivery,
    'DeliveryTerms': order.deliveryTerms,
    'PaymentMeans': order.paymentMeans,
    'PaymentTerms': order.paymentTerms,
    'AllowanceCharge': order.allowanceCharge,
    'TaxTotal': order.taxTotal,
    'AnticipatedMonetaryTotal': order.anticipatedMonetaryTotal,
    'OrderLine': order.orderLines,
  };

  // Remove undefined values so they don't appear in the XML
  for (const key of Object.keys(orderObj)) {
    if (orderObj[key] === undefined) {
      delete orderObj[key];
    }
  }

  const xmlObj = {
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    'Order': orderObj,
  };

  return builder.build(xmlObj);
}
