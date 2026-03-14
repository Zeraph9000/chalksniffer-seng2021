import { Order, MonetaryTotal, OrderPaginated, OrderList, OrderFilter } from '../types';
import OrderModel from '../models/order';

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

export function getPageList(orders: Order[], limit: number): OrderList {
    const paginatedOrders: OrderPaginated[] = [];

    orders.forEach(o => {
        const order: OrderPaginated = {
            id: o.id,
            buyerName: o.buyerCustomerParty.party.partyName,
            sellerName: o.sellerSupplierParty.party.partyName,
            payableAmount: o.anticipatedMonetaryTotal.payableAmount,
        }

        paginatedOrders.push(order);
    });

    return {
        orders: paginatedOrders.slice(0, limit),
        limit,
        totalOrders: orders.length
    };
}
