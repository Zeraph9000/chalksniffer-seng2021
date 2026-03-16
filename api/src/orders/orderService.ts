import OrderModel from '../models/order';
import OrderXml from '../models/orderXml';
import { apiKeyValidation, getUserId } from '../auth/auth';
import { ErrorObject, Order, OrderFilter, OrderList } from '../types';
import { getOrderPages } from '../utils/orderHelpers';
import { json2csv } from 'json-2-csv';

export async function deleteOrder(userId: string, id: string): Promise<{ message: string } | ErrorObject> {
  const foundOrder = getOrder(userId, id);
  if (!foundOrder) return { error: 'INVALID_USER_ID', message: `User does not own an order with the ID ${id}` };

  await OrderXml.deleteOne({ orderId: id });
  await OrderModel.deleteOne({ id, userId });

  return { message: `Order ${id} deleted successfully` };
}

// Return the order based on ID and userId
export async function getOrder(userId: string, id: string): Promise<Order> {
  const foundOrder = await OrderModel.findOne({ id, userId });
  return foundOrder as Order;
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
