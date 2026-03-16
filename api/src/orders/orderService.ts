import OrderModel from '../models/order';
import OrderXml from '../models/orderXml';
import { ErrorObject } from '../types';

export async function deleteOrder(userId: string, id: string): Promise<{ message: string } | ErrorObject> {
  const foundOrder = await OrderModel.findOne({ id, userId });
  if (!foundOrder) return { error: 'INVALID_USER_ID', message: `User does not own an order with the ID ${id}` };

  await OrderXml.deleteOne({ orderId: id });
  await OrderModel.deleteOne({ id, userId });

  return { message: `Order ${id} deleted successfully` };
}
