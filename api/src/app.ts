import express from 'express';
import { router as authRouter } from './auth/auth';
import OrderXml from './models/orderXml';
import OrderModel from './models/order';
import RecurringOrderModel from './models/recurringOrder';
import { validateOrder } from './utils/validation';
import { calculateMonetaryTotal } from './utils/orderCalculations';
import { buildOrderXml } from './utils/xmlBuilder';
import { generateOrderInstances, scheduleCronJob } from './utils/recurringOrderService';
import { apiKeyValidation } from './auth/auth';
import { Order, OrderResponse, Frequency, RecurringOrderResponse } from './types';
import { getUserId } from './auth/auth';

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
    const { recurring, frequency, startDate, ...orderBody } = req.body;

    const validFrequencies: Frequency[] = ['Daily', 'Weekly', 'Monthly'];
    if (!frequency || !validFrequencies.includes(frequency)) {
      return res.status(400).json({ errors: [{ field: 'frequency', message: 'must be one of: Daily, Weekly, Monthly' }] });
    }
    if (!startDate || isNaN(Date.parse(startDate))) {
      return res.status(400).json({ errors: [{ field: 'startDate', message: 'required and must be a valid ISO 8601 datetime (e.g. 2026-03-15T09:00:00Z)' }] });
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

export default app;
