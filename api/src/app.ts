import express from 'express';
import OrderXml from './models/orderXml';
import OrderModel from './models/order';
import { validateOrder } from './utils/validation';
import { calculateMonetaryTotal } from './utils/orderCalculations';
import { buildOrderXml } from './utils/xmlBuilder';
import { apiKeyValidation } from './auth/auth';
import { OrderResponse } from './types';

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/orders', async (req, res) => {
  const auth = req.headers.authorization as string;
  if (!await apiKeyValidation(auth)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const validation = validateOrder(req.body);
  if (!validation.res) {
    return res.status(400).json({ errors: validation.errors });
  }

  const orderId = crypto.randomUUID();
  const order: OrderResponse = {
    id: orderId,
    issueDate: new Date().toISOString().slice(0, 10),
    documentCurrencyCode: req.body.documentCurrencyCode,
    buyerCustomerParty: req.body.buyerCustomerParty,
    sellerSupplierParty: req.body.sellerSupplierParty,
    orderLines: req.body.orderLines,
    anticipatedMonetaryTotal: calculateMonetaryTotal(req.body),
    createdAt: new Date(),
    xmlUrl: `/orders/${orderId}/xml`
  }

  await OrderModel.create(order);

  const xml = buildOrderXml(order);
  await OrderXml.create({ orderId: order.id, xml });

  return res.status(200).json(order);
});

export default app;
