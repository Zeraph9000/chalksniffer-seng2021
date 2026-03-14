import express from 'express';
import { router as authRouter } from './auth/auth';
import OrderXml from './models/orderXml';
import OrderModel from './models/order';
import { validateOrder } from './utils/validation';
import { calculateMonetaryTotal, getPageList } from './utils/orderHelpers';
import { buildOrderXml } from './utils/xmlBuilder';
import { apiKeyValidation } from './auth/auth';
import { Order, OrderResponse, OrderList, OrderFilter } from './types';
import exportCSV from 'export-to-csv';

const app = express();
const csvConfig = exportCSV.mkConfig({ useKeysAsHeaders: true, fieldSeparator: ',' });

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

app.get('/orders', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !await apiKeyValidation(auth)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const { limit, ...filterBody } = req.body;
  const filter: OrderFilter = Object.fromEntries(
  Object.entries(filterBody as Partial<OrderFilter>)
    .filter(([, v]) => v !== undefined));

  const ordersFound = await OrderModel.find(filter) as Order[];
  const orders = getPageList(ordersFound, parseInt(limit));

  return res.status(200).json(orders);
});

app.get('/orders/csv', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !await apiKeyValidation(auth)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const { limit, ...filterBody } = req.body;
  const filter: OrderFilter = Object.fromEntries(
  Object.entries(filterBody as Partial<OrderFilter>)
    .filter(([, v]) => v !== undefined));

  const ordersFound = await OrderModel.find(filter) as Order[];
  const orderPages = getPageList(ordersFound, parseInt(limit)).orders;
  if (orderPages.length == 0) return res.status(200);

  const csv = exportCSV.generateCsv(csvConfig)(orderPages);

  return res.status(200).send(csv);
});

export default app;
