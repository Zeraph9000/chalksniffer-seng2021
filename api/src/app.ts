import express from 'express';
import { router as authRouter, getUserId, apiKeyValidation, getApiKeyFromAuthorizationHeader } from './auth/auth';
import OrderXml from './models/orderXml';
import OrderModel from './models/order';
import { validateOrder } from './utils/validation';
import { calculateMonetaryTotal, getOrderPages, parsePagedQuery } from './utils/orderHelpers';
import { buildOrderXml } from './utils/xmlBuilder';
import { getOrderXmlResponse } from './utils/getOrderXml';
import { editOrderFmt, Order, OrderResponse, Frequency, RecurringOrderResponse, OrderFilter } from './types';
import RecurringOrderModel from './models/recurringOrder';
import { generateOrderInstances, scheduleCronJob } from './utils/recurringOrderService';
import { json2csv } from 'json-2-csv';
import { json } from 'node:stream/consumers';

const app = express();

app.use(express.json());
app.use('/auth', authRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/orders', async (req, res) => {
  const apiKey = req.headers.authorization;
  if (!apiKey || !await apiKeyValidation(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const userId = (await getUserId(apiKey)) as string;

  // Recurring order branch
  if (req.body.recurring === true) {
    const { frequency, startDate, ...orderBody } = req.body;

    const validFrequencies: Frequency[] = ['Daily', 'Weekly', 'Monthly'];
    if (!frequency || !validFrequencies.includes(frequency)) {
      return res.status(400).json({ errors: [{ field: 'frequency', message: 'must be one of: Daily, Weekly, Monthly' }] });
    }
    if (!startDate || isNaN(Date.parse(startDate))) {
      return res.status(400).json({ errors: [{ field: 'startDate', message: 'required and must be a valid date string (e.g. 2026-03-15T09:00:00Z or 2026-03-15)' }] });
    }

    const templateOrderId = crypto.randomUUID();
    const templateOrder: Order = {
      ...orderBody,
      userId,
      id: templateOrderId,
      issueDate: orderBody.issueDate || startDate.split('T')[0],
      anticipatedMonetaryTotal: calculateMonetaryTotal(orderBody),
    };

    const validation = validateOrder(templateOrder);
    if (!validation.res) {
      return res.status(400).json({ errors: validation.errors });
    }

    const recurringOrderId = crypto.randomUUID();
    const orderInstances = generateOrderInstances(templateOrder, startDate, frequency);

    await RecurringOrderModel.create({
      id: recurringOrderId,
      userId,
      order: templateOrder,
      frequency,
      startDate,
      orderInstances,
    });

    scheduleCronJob(recurringOrderId, frequency, startDate);

    const response: RecurringOrderResponse = {
      id: recurringOrderId,
      frequency,
      startDate,
      createdAt: new Date(),
    };

    return res.status(200).json(response);
  }

  // Existing non-recurring order path
  const orderId = crypto.randomUUID();
  const now = new Date();

  const fullOrder: Order = {
    ...req.body,
    id: orderId,
    userId,
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

  await OrderModel.create(fullOrder);

  const xml = buildOrderXml(fullOrder);
  await OrderXml.create({ orderId: fullOrder.id, xml });

  return res.status(200).json(order);
});

app.put ('/orders/:id', async (req, res) => {
  const apiKey = getApiKeyFromAuthorizationHeader(req) as string;

  if (!apiKey || !await apiKeyValidation(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const body = req.body as editOrderFmt;

  const id = req.params.id as string;

  const editedOrder = await OrderModel.findOne({ id: id });

  if (!editedOrder) {
    return res.status(400).json({ error: 'Order does not exist' });
  }

  const userId = await getUserId(apiKey);
  if (!userId) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const orderUserId = editedOrder.userId;

  if (await userId !== orderUserId) {
    return res.status(403).json({ error: 'user does not own requested order' });
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

  const editedOrderObject = editedOrder.toObject();
  editedOrderObject.anticipatedMonetaryTotal = calculateMonetaryTotal(editedOrderObject);

  editedOrder.set('anticipatedMonetaryTotal', editedOrderObject.anticipatedMonetaryTotal);

  const validation = validateOrder(editedOrderObject);
  if (!validation.res) {
    return res.status(400).json({ errors: validation.errors });
  }

  await editedOrder.save();

  const updatedXml = buildOrderXml(editedOrder.toObject());
  await OrderXml.updateOne(
    { orderId: editedOrder.id },
    { xml: updatedXml },
    { upsert: true }
  );

  return res.status(200).json(editedOrder);
});

app.get ('/orders/:id/xml', async (req, res) => {
  const result = await getOrderXmlResponse(
    getApiKeyFromAuthorizationHeader(req) as string | undefined,
    req.params.id as string
  );

  if (result.status !== 200) {
    return res.status(result.status).json(result.body);
  }

  res.set('Content-Type', 'application/xml');
  return res.status(200).send(result.xml);
});

app.get('/orders', async (req, res) => {
  const apiKey = getApiKeyFromAuthorizationHeader(req) as string;
  if (!apiKey || !await apiKeyValidation(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const userId = await getUserId(apiKey);
  const q = parsePagedQuery(req.query, userId as string);

  if ('error' in q) {
    return res.status(400).json(q);
  }

  const ordersFound = await OrderModel.find(q.filter as OrderFilter)
    .skip(q.offset as number)
    .lean();
  const orders = getOrderPages(ordersFound, q.limit as number);

  return res.status(200).json(orders);
});

app.get('/orders/csv', async (req, res) => {
  const apiKey = getApiKeyFromAuthorizationHeader(req) as string;
  if (!apiKey || !await apiKeyValidation(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const userId = await getUserId(apiKey);
  const q = parsePagedQuery(req.query, userId as string);

  if ('error' in q) {
    return res.status(400).json(q);
  }

  const ordersFound = await OrderModel.find(q.filter as OrderFilter)
    .skip(q.offset as number)
    .lean();
  const orders = getOrderPages(ordersFound, q.limit as number);

  if (orders.orders.length === 0) return res.status(200).send('');
  const csv = await json2csv(orders.orders);

  return res.status(200).send(csv);
});

app.get('/order/recommend', async (req, res) => {
  const apiKey = getApiKeyFromAuthorizationHeader(req) as string;

  if (!apiKey || !await apiKeyValidation(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const userId = getUserId(apiKey);

  const ordersMongoose = await OrderModel.find({ userId: userId });
  let orders = [];
  for (const o of ordersMongoose) {
    orders.push(o.toObject());
  }

  for (const o of orders) {
    orders.map
  }

  const freq = new Map<string, number>();

  for (const o of orders) {
    const key = JSON.stringify(o);
    freq.set(key, (freq.get(key) ?? 0) + 1);
  }

  let mostFreqKey: string | null = null;
  let mostFreqCount = 0;
  for (const [k, count] of freq) {
    if (count > mostFreqCount) {
      mostFreqCount = count;
      mostFreqKey = k;
    }
  }

  if (!mostFreqKey) {
    return res.status(400).json({ error: 'No Orders Found' });
  }

  const mostFreq: Order = JSON.parse(mostFreqKey);

  return res.status(200).json(mostFreq);


});

export default app;