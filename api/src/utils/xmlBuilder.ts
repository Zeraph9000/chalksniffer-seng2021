import { XMLBuilder } from 'fast-xml-parser';
import type { OrderResponse } from '../types';

const builder = new XMLBuilder({
  ignoreAttributes: false,
  format: true,
  suppressEmptyNode: true,
});

export function buildOrderXml(order: OrderResponse): string {
  const xmlObj = {
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    'Order': {
      '@_xmlns': 'urn:oasis:names:specification:ubl:schema:xsd:Order-2',
      'ID': order.id,
      'IssueDate': order.issueDate,
      'DocumentCurrencyCode': order.documentCurrencyCode,
      'BuyerCustomerParty': order.buyerCustomerParty,
      'SellerSupplierParty': order.sellerSupplierParty,
      'OrderLine': order.orderLines,
      'AnticipatedMonetaryTotal': order.anticipatedMonetaryTotal,
    },
  };

  return builder.build(xmlObj);
}
