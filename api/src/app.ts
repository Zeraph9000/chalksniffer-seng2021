import express, { Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { router as authRouter, getUserId, apiKeyValidation } from './auth/auth';
import OrderModel from './models/order';
import { getOrderPages, parsePagedQuery } from './utils/orderHelpers';
import { getOrderXmlResponse } from './utils/getOrderXml';
import { editOrderFmt, OrderFilter } from './types';
import { handleError } from './utils/httpErrors';
import { processAllRecurringOrders, editNextInstance, createRecurringOrder } from './orders/recurringOrderService';
import { deleteOrder, updateOrder, createOrder } from './orders/orderService';
import { json2csv } from 'json-2-csv';
import { getApiKeyFromAuthorizationHeader, getUserIdFromApiKey } from './utils/serverHelpers';

const app = express();
app.use(cors());

const yamlPath = process.env.VERCEL
  ? path.join(process.cwd(), 'api/endpoints.yaml')
  : path.join(__dirname, '../endpoints.yaml');
const swaggerDocument = YAML.load(yamlPath);
const swaggerUiDistPath = require('swagger-ui-dist').getAbsoluteFSPath();
const swaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .opblock .opblock-summary-path-description-wrapper { align-items: center; display: flex; flex-wrap: wrap; gap: 0 10px; padding: 0 10px; width: 100%; }',
  customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui.min.css',
};
app.use('/docs', express.static(swaggerUiDistPath, { index: false }), swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerUiOptions));

app.use(express.json());
app.use('/auth', authRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/orders', async (req: Request, res: Response) => {
  try {
    const authResult = await getUserIdFromApiKey(req);
    if ('error' in authResult) return handleError(res, authResult);

    if (req.body.recurring === true) {
      const result = await createRecurringOrder(authResult.userId, req.body);
      if ('errors' in result) return res.status(400).json(result);
      return res.status(200).json(result);
    }

    const result = await createOrder(authResult.userId, req.body);
    if ('errors' in result) return res.status(400).json(result);
    return res.status(200).json(result);
  } catch {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
  }
});

app.get('/orders/:id/xml', async (req, res) => {
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

app.post('/orders/recurring', async (_req: Request, res: Response) => {
  try {
    const result = await processAllRecurringOrders();
    if (result) return res.status(400).json(result);
    
    res.status(200).json({});
  } catch {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Failed to process recurring orders' });
  }
});

app.get('/orders/:id', async (req, res) => {
  const apiKey = getApiKeyFromAuthorizationHeader(req) as string;
  if (!apiKey || !await apiKeyValidation(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const id = req.params.id as string;
  const userId = await getUserId(apiKey);
  if (!userId) {
    return res.status(403).json({ error: 'API key does not belong to user' });
  }

  const foundOrder = await OrderModel.findOne({ id, userId });
  if (!foundOrder) {
    return res.status(400).json({ error: `User does not own an order with the ID ${id}` });
  }

  return res.status(200).json(foundOrder);
});

app.put('/orders/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;

  try {
    const authResult = await getUserIdFromApiKey(req);
    if ('error' in authResult) return handleError(res, authResult);

    const result = await updateOrder(authResult.userId, id, req.body as editOrderFmt);
    if ('error' in result) return handleError(res, result);
    if ('errors' in result) return res.status(400).json(result);

    return res.status(200).json(result);
  } catch {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
  }
});

app.delete('/orders/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;

  try {
    const authResult = await getUserIdFromApiKey(req);
    if ('error' in authResult) return handleError(res, authResult);

    const result = await deleteOrder(authResult.userId, id);
    if ('error' in result) return handleError(res, result);

    return res.status(200).json(result);
  } catch {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
  }
});

app.put('/order/instance/:id', async (req, res) => {
  const apiKey = getApiKeyFromAuthorizationHeader(req) as string;
  if (!apiKey || !await apiKeyValidation(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const userId = await getUserId(apiKey);
  if (!userId) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const result = await editNextInstance(req.params.id, userId, req.body);
  return res.status(result.status).json(result.body);
});

export default app;