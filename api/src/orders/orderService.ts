import OrderModel from '../models/order';
import OrderXml from '../models/orderXml';
import { validateOrder, ValidationError } from '../utils/validation';
import { calculateMonetaryTotal, getOrderPages } from '../utils/orderHelpers';
import { buildOrderXml } from '../utils/xmlBuilder';
import { ErrorObject, editOrderFmt, Order, OrderResponse, OrderFilter, OrderList } from '../types';
import { json2csv } from 'json-2-csv';

// Return the order based on ID and userId
export async function getOrder(userId: string, id: string): Promise<Order | ErrorObject> {
  const order = await OrderModel.findOne({ id });
  if (order && order.userId !== userId) {
    return { error: 'FORBIDDEN', message: 'User is forbidden from accessing this order' };
  } else if (!order) {
    return { error: 'INVALID_ORDER_ID', message: `User does not own an order with ID ${id}` };
  }

  return order as Order;
}

// Return a list of orders found
export async function listOrders(filter: OrderFilter | undefined,
  limit: number, offset: number): Promise<OrderList> {
  const totalOrders = await OrderModel.countDocuments(filter);
  const ordersFound = await OrderModel.find(filter)
    .skip(offset)
    .limit(limit)
    .lean();

  const orders = getOrderPages(ordersFound, limit, offset, totalOrders);
  return orders;
}

// Return a CSV of orders found
export async function getOrderCSV(filter: OrderFilter | undefined,
  limit: number, offset: number): Promise<string> {
  const orders = await listOrders(filter, limit, offset);

  if (orders.orders.length === 0) return '';
  const csv = await json2csv(orders.orders);
  return csv;
}

// Delete the order based on the id given
export async function deleteOrder(userId: string, id: string): Promise<{ message: string } | ErrorObject> {
  const getRes = await getOrder(userId, id);
  if ('error' in getRes) return getRes;

  await OrderXml.deleteOne({ orderId: id });
  await OrderModel.deleteOne({ id, userId });

  return { message: `Order ${id} deleted successfully` };
}

// Update the order based on the id given
export async function updateOrder(userId: string, id: string, body: editOrderFmt): Promise<object | ErrorObject | { errors: ValidationError[] }> {
  const order = await OrderModel.findOne({ id });
  if (!order) return { error: 'INVALID_ORDER_ID', message: `Order with ID ${id} does not exist` };
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

export async function createOrder(userId: string, body: any): Promise<OrderResponse | { errors: ValidationError[] }> {
  const orderId = crypto.randomUUID();
  const now = new Date();
  const fullOrder: Order = {
    ...body,
    id: orderId,
    userId,
    issueDate: body.issueDate,
    anticipatedMonetaryTotal: calculateMonetaryTotal(body),
    createdAt: now.toISOString(),
    xmlUrl: `/orders/${orderId}/xml`,
  };

  const validation = validateOrder(fullOrder);
  if (!validation.res) return { errors: validation.errors };

  await OrderModel.create(fullOrder);
  const xml = buildOrderXml(fullOrder);
  await OrderXml.create({ orderId: fullOrder.id, xml });

  return {
    id: orderId,
    issueDate: fullOrder.issueDate,
    documentCurrencyCode: fullOrder.documentCurrencyCode,
    buyerCustomerParty: fullOrder.buyerCustomerParty,
    sellerSupplierParty: fullOrder.sellerSupplierParty,
    orderLines: fullOrder.orderLines,
    anticipatedMonetaryTotal: fullOrder.anticipatedMonetaryTotal!,
    createdAt: now,
    xmlUrl: `/orders/${orderId}/xml`,
  };
}
