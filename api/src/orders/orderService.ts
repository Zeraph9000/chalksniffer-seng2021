import OrderModel from '../models/order';
import OrderXml from '../models/orderXml';
import { apiKeyValidation, getUserId } from '../auth/auth';
import { ErrorObject, Order, OrderFilter, OrderList } from '../types';
import { getOrderPages } from '../utils/orderHelpers';
import { json2csv } from 'json-2-csv';

export async function deleteOrder(apiKey: string | null, id: string): Promise<{ message: string } | ErrorObject> {
  if (!apiKey || !await apiKeyValidation(apiKey)) {
    return { error: 'UNAUTHORIZED', message: 'Invalid API key' };
  }

  const userId = await getUserId(apiKey);
  if (!userId) {
    return { error: 'FORBIDDEN', message: 'API key does not belong to user' };
  }

  const foundOrder = await OrderModel.findOne({ id, userId });
  if (!foundOrder) return { error: 'INVALID_USER_ID', message: `User does not own an order with the ID ${id}` };

  await OrderXml.deleteOne({ orderId: id });
  await OrderModel.deleteOne({ id, userId });

  return { message: `Order ${id} deleted successfully` };
}

// Return the order based on ID
export async function getOrder(userId: string, id: string): Promise<ErrorObject | Order> {
  const foundOrder = await OrderModel.findOne({ id, userId });
  if (!foundOrder) return { error: 'INVALID_ORDER_ID', message: `User does not own an order with the ID ${id}` };
  return foundOrder;
}

// Return a list of orders found
export async function listOrders(userId: string, filter: OrderFilter | undefined,
  limit: number, offset: number): Promise<OrderList> {
  const ordersFound = await OrderModel.find(filter)
    .skip(offset as number)
    .lean();

  const orders = getOrderPages(ordersFound, limit);
  return orders;
}

// Return a CSV of orders found
export async function getOrderCSV(userId: string, filter: OrderFilter | undefined,
  limit: number, offset: number): Promise<string> {
  const orders = await listOrders(userId, filter, limit, offset);

  if (orders.orders.length === 0) return '';
  const csv = await json2csv(orders.orders);
  return csv;
}
