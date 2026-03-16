import { Order, MonetaryTotal, OrderPaginated, OrderList, PaginationParams, OrderFilter, ErrorObject } from '../types';

export function calculateMonetaryTotal(order: Order): MonetaryTotal {
  // Sum of quantity × priceAmount for each line item
  const lineExtensionAmount = order.orderLines.reduce((sum, line) => {
    const li = line.lineItem;
    return sum + li.quantity * li.price.priceAmount;
  }, 0);

  // Separate allowances (discounts) and charges (surcharges)
  let allowanceTotalAmount = 0;
  let chargeTotalAmount = 0;
  if (order.allowanceCharge) {
    for (const ac of order.allowanceCharge) {
      if (ac.chargeIndicator) {
        chargeTotalAmount += ac.amount;
      } else {
        allowanceTotalAmount += ac.amount;
      }
    }
  }

  // Tax-exclusive = line totals - allowances + charges
  const taxExclusiveAmount = lineExtensionAmount - allowanceTotalAmount + chargeTotalAmount;

  // Total tax from taxTotal if provided
  const totalTax = order.taxTotal?.taxAmount ?? 0;

  // Tax-inclusive = tax-exclusive + tax
  const taxInclusiveAmount = taxExclusiveAmount + totalTax;

  // Payable = tax-inclusive (same as final amount owed)
  const payableAmount = taxInclusiveAmount;

  return {
    lineExtensionAmount,
    taxExclusiveAmount,
    taxInclusiveAmount,
    allowanceTotalAmount,
    chargeTotalAmount,
    payableAmount,
  };
}

export function getOrderPages(ordersFound: Order[], limit: number, offset: number, totalOrders: number): OrderList {
  const pagedOrders: OrderPaginated[] = ordersFound.map((o) => ({
    id: o.id,
    issueDate: o.issueDate,
    buyerName: o.buyerCustomerParty.party.partyName,
    sellerName: o.sellerSupplierParty.party.partyName,
    payableAmount: o.anticipatedMonetaryTotal?.payableAmount ?? 0,
    documentCurrencyCode: o.documentCurrencyCode,
    createdAt: o.createdAt as string,
  }));

  return {
    orders: pagedOrders,
    limit,
    offset,
    totalOrders,
  };
}

export function parsePagedQuery(query: Record<string, unknown>, userId: string): PaginationParams | ErrorObject {
  const { limit, offset, ...queryFilter } = query;

  const lim = limit != null ? parseInt(limit as string) : 20;
  if (isNaN(lim) || lim < 1 || lim > 500) return { error: 'INVALID_LIMIT', message: 'Limit must be between 1 and 500 inclusive' };
  const offs = offset != null ? parseInt(offset as string) : 0;
  if (isNaN(offs) || offs < 0) return { error: 'INVALID_OFFSET', message: 'Offset must be greater than or equal to 0' };

  const { buyerName, sellerName, payableAmount, ...rest } = queryFilter as Record<string, unknown>;

  const qfilter: OrderFilter = { userId, ...rest };
  if (buyerName !== undefined) {
    qfilter['buyerCustomerParty.party.partyName'] = buyerName as string;
  }
  if (sellerName !== undefined) {
    qfilter['sellerSupplierParty.party.partyName'] = sellerName as string;
  }
  if (payableAmount !== undefined) {
    qfilter['anticipatedMonetaryTotal.payableAmount'] = payableAmount as number;
  }

  return { limit: lim, offset: offs, filter: qfilter };
}
