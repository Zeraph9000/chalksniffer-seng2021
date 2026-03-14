import { Order, MonetaryTotal, editOrderFmt } from '../types';

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

function editOrder(auth: string | undefined, id: string, body: editOrderFmt) {

}