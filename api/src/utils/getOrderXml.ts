import { apiKeyValidation, getUserId } from '../auth/auth';
import OrderModel from '../models/order';
import OrderXml from '../models/orderXml';

type GetOrderXmlError = {
  error: string;
};

type GetOrderXmlResult =
  | {
    status: 200;
    xml: string;
  }
  | {
    status: 400 | 401 | 403;
    body: GetOrderXmlError;
  };

export async function getOrderXmlResponse(
  apiKey: string | undefined,
  orderId: string
): Promise<GetOrderXmlResult> {
  if (!apiKey || !await apiKeyValidation(apiKey)) {
    return {
      status: 401,
      body: { error: 'Invalid API key' },
    };
  }

  const order = await OrderModel.findOne({ id: orderId });

  if (!order) {
    return {
      status: 400,
      body: { error: 'Order does not exist' },
    };
  }

  const userId = await getUserId(apiKey);

  if (userId !== order.userId) {
    return {
      status: 403,
      body: { error: 'user does not own requested order' },
    };
  }

  const orderXml = await OrderXml.findOne({ orderId });

  if (!orderXml) {
    return {
      status: 400,
      body: { error: 'Order does not exist' },
    };
  }

  return {
    status: 200,
    xml: orderXml.xml,
  };
}
