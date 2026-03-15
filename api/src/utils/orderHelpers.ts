import { Order, MonetaryTotal, OrderPaginated, OrderList } from '../types';

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

export function getOrderPages(ordersFound: Order[], limit: number): OrderList {
  const pagedOrders: OrderPaginated[] = [];

  ordersFound.forEach((o) => {
    pagedOrders.push({
      id: o.id,
      issueDate: o.issueDate,
      buyerName: o.buyerCustomerParty.party.partyName,
      sellerName: o.sellerSupplierParty.party.partyName,
      payableAmount: calculateMonetaryTotal(o).payableAmount ?? 0,
      documentCurrencyCode: o.documentCurrencyCode,
      createdAt: o.createdAt,
    });
  });

  return {
    orders: pagedOrders.slice(0, limit),
    limit,
    totalOrders: pagedOrders.length
  };
}
