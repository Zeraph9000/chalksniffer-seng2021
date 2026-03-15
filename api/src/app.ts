import express from 'express';
import { router as authRouter, getUserId, apiKeyValidation, getApiKeyFromAuthorizationHeader } from './auth/auth';
import OrderXml from './models/orderXml';
import OrderModel from './models/order';
import { validateOrder } from './utils/validation';
import { calculateMonetaryTotal, getOrderPages } from './utils/orderHelpers';
import { buildOrderXml } from './utils/xmlBuilder';
import { editOrderFmt, Order, OrderResponse, Frequency, RecurringOrderResponse, OrderFilter } from './types';
import RecurringOrderModel from './models/recurringOrder';
import { generateOrderInstances, scheduleCronJob } from './utils/recurringOrderService';

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

  const userId = getUserId(apiKey);

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

app.get('/orders', async (req, res) => {
  const apiKey = getApiKeyFromAuthorizationHeader(req) as string;
  if (!apiKey || !await apiKeyValidation(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const userId = getUserId(apiKey);
  const { limit, offset } = req.body;
  const filter: OrderFilter = { userId, ...req.query };

  const ordersFound = await OrderModel.find(filter)
    .skip(parseInt(offset))
    .lean();
  const orders = getOrderPages(ordersFound, parseInt(limit));

  return res.status(200).json(orders);
});

export default app;
