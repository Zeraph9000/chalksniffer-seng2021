import express from 'express';
import { router as authRouter } from './auth/auth';
import OrderXml from './models/orderXml';
import OrderModel from './models/order';
import { validateOrder, type ValidationResult } from './utils/validation';
import { calculateMonetaryTotal } from './utils/orderCalculations';
import { buildOrderXml } from './utils/xmlBuilder';
import { apiKeyValidation, getApiKeyFromAuthorizationHeader, getUserId } from './auth/auth';
import { editOrderFmt, Order, OrderResponse } from './types';

const app = express();
app.use(express.json());

app.use('/auth', authRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/orders', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !await apiKeyValidation(auth)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const orderId = crypto.randomUUID();
  const now = new Date();

  const fullOrder: Order = {
    ...req.body,
    id: orderId,
    issueDate: req.body.issueDate,
    anticipatedMonetaryTotal: calculateMonetaryTotal(req.body),
    createdAt: now.toISOString(),
    xmlUrl: `/orders/${orderId}/xml`,
  };

  const validation = validateOrder(fullOrder);
  if (!validation.res) {
    return res.status(400).json({ errors: validation.errors });
  }

  const order: OrderResponse = {
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

  await OrderModel.create(order);

  const xml = buildOrderXml(fullOrder);
  await OrderXml.create({ orderId: order.id, xml });

  return res.status(200).json(order);
});

app.put ('/orders/:id', async (req, res) => {
  const apiKey = getApiKeyFromAuthorizationHeader(req) as string;

  if (!apiKey || !await apiKeyValidation(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const id = req.params.id as string;

  const userId = getUserId(apiKey);

  if (await userId !== id) {
    return res.status(403).json({ error: 'order does not belong to the user' });
  }

  let body = req.body as editOrderFmt;

  let editedOrder = await OrderModel.findOne({ id: id });


  if (!editedOrder) {
    return res.status(400).json({ error: 'Order does not exist' });
  }

  if (body.note) {
    editedOrder.set('note', body.note);
  }
  if (body.delivery) {
    editedOrder.set('delivery', body.delivery);
  }
  if (body.orderLines) {
    editedOrder.set('orderLines', body.orderLines);
  }

  let editedOrderObject = editedOrder.toObject();
  editedOrderObject.anticipatedMonetaryTotal = calculateMonetaryTotal(editedOrderObject);

  const validation = validateOrder(editedOrderObject);
  if (!validation.res) {
    return res.status(400).json({ errors: validation.errors });
  }

  await editedOrder.save();
  
  return res.status(200).json(editedOrder);

});

export default app;
