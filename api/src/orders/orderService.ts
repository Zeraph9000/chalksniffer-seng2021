import OrderModel from '../models/order';
import OrderXml from '../models/orderXml';
import { validateOrder, ValidationError } from '../utils/validation';
import { calculateMonetaryTotal } from '../utils/orderHelpers';
import { buildOrderXml } from '../utils/xmlBuilder';
import { ErrorObject, editOrderFmt } from '../types';

// Delete the order based on the id given
export async function deleteOrder(userId: string, id: string): Promise<{ message: string } | ErrorObject> {
  const foundOrder = await OrderModel.findOne({ id, userId });
  if (!foundOrder) return { error: 'INVALID_USER_ID', message: `User does not own an order with the ID ${id}` };

  await OrderXml.deleteOne({ orderId: id });
  await OrderModel.deleteOne({ id, userId });

  return { message: `Order ${id} deleted successfully` };
}

// Update the order based on the id given
export async function updateOrder(userId: string, id: string, body: editOrderFmt): Promise<object | ErrorObject | { errors: ValidationError[] | [{ field: string, message: string }] }> {
  const order = await OrderModel.findOne({ id });
  if (!order) return { errors: [{ field: 'id', message: `Order with ID ${id} does not exist` }] };
  if (order.userId !== userId) return { error: 'FORBIDDEN', message: 'User does not own requested order' };

  const updatableFields = [
    'salesOrderId', 'issueTime', 'orderTypeCode', 'note', 'customerReference',
    'accountingCostCode', 'validityPeriod', 'quotationDocumentReference',
    'orderDocumentReference', 'originatorDocumentReference', 'additionalDocumentReference',
    'originatorCustomerParty', 'delivery', 'deliveryTerms', 'paymentMeans',
    'paymentTerms', 'allowanceCharge', 'taxTotal', 'orderLines',
  ] as const;

  for (const field of updatableFields) {
    if (body[field] != null) order.set(field, body[field]);
  }

  const orderObject = order.toObject();
  orderObject.anticipatedMonetaryTotal = calculateMonetaryTotal(orderObject);
  order.set('anticipatedMonetaryTotal', orderObject.anticipatedMonetaryTotal);

  const validation = validateOrder(orderObject);
  if (!validation.res) return { errors: validation.errors };

  await order.save();

  const updatedXml = buildOrderXml(order.toObject());
  await OrderXml.updateOne({ orderId: order.id }, { xml: updatedXml }, { upsert: true });

  return order.toObject();
}
