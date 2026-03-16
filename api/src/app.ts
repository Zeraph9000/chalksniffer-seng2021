import express, { Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { router as authRouter, getUserId, apiKeyValidation } from './auth/auth';
import { parsePagedQuery } from './utils/orderHelpers';
import { getOrderXmlResponse } from './utils/getOrderXml';
import { editOrderFmt } from './types';
import { handleError } from './utils/httpErrors';
import RecurringOrderModel from './models/recurringOrder';
import { deleteOrder, createOrder, updateOrder, listOrders, getOrderFromIds, getOrderCSV } from './orders/orderService';
import { editRecurringOrder, createRecurringOrder, deleteRecurringOrder, editInstance, generateOrderInstances, processAllRecurringOrders } from './orders/recurringOrderService';
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
  try {
    const result = await getUserIdFromApiKey(req);
    if ('error' in result) return handleError(res, result);

    const userId = result.userId;
    const qRes = parsePagedQuery(req.query, userId);
    if ('error' in qRes) return handleError(res, qRes);
    const orders = await listOrders(qRes.filter, qRes.limit, qRes.offset);
    
    return res.status(200).json(orders);
  } catch {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Failed to process orders list' });
  }
});

app.get('/orders/csv', async (req, res) => {
  try {
    const result = await getUserIdFromApiKey(req);
    if ('error' in result) return handleError(res, result);
    const userId = result.userId;

    const qRes = parsePagedQuery(req.query, userId);
    if ('error' in qRes) return handleError(res, qRes);
    const csv = await getOrderCSV(qRes.filter, qRes.limit, qRes.offset);
    
    return res.status(200).send(csv);
  } catch {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Failed to process orders CSV' });
  }
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
  try {
    const result = await getUserIdFromApiKey(req);
    if ('error' in result) return handleError(res, result);
    const userId = result.userId;
    const id = req.params.id as string;

    const orderRes = await getOrderFromIds(userId, id);
    if ('error' in orderRes) return handleError(res, orderRes);

    res.status(200).json(orderRes);
  } catch {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Failed to process orders' });
  }
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

app.delete('/orders/recurring/:id/instance/:position', async (req, res) => {
  const apiKey = getApiKeyFromAuthorizationHeader(req) as string | undefined;
  if (!apiKey || !await apiKeyValidation(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const { id } = req.params;
  const position = Number(req.params.position);
  const userId = await getUserId(apiKey);
  if (!userId) {
    return res.status(403).json({ error: 'API key does not belong to user' });
  }

  const recurringOrder = await RecurringOrderModel.findOne({ id });
  if (!recurringOrder) {
    return res.status(400).json({ error: `Recurring order with ID ${id} does not exist` });
  }

  if (userId !== recurringOrder.userId) {
    return res.status(403).json({ error: 'user does not own requested recurring order' });
  }

  if (!Number.isInteger(position) || position < 0 || position >= recurringOrder.orderInstances.length) {
    return res.status(400).json({ error: `Invalid position ${req.params.position}. Must be an integer between 0 and ${recurringOrder.orderInstances.length - 1}` });
  }

  recurringOrder.orderInstances.splice(position, 1);
  await recurringOrder.save();

  return res.status(200).json({ message: `Instance at position ${position} deleted from recurring order ${id}` });
});

app.put('/orders/recurring/:id', async (req, res) => {
  const apiKey = getApiKeyFromAuthorizationHeader(req) as string | undefined;
  if (!apiKey || !await apiKeyValidation(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  const userId = await getUserId(apiKey);
  if (!userId) {
    return res.status(403).json({ error: 'API key does not belong to user' });
  }
  const result = await editRecurringOrder(req.params.id, userId, req.body);
  return res.status(result.status).json(result.body);
});

app.delete('/orders/recurring/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;

  try {
    const authResult = await getUserIdFromApiKey(req);
    if ('error' in authResult) return handleError(res, authResult);

    const result = await deleteRecurringOrder(authResult.userId, id);
    if ('error' in result) return handleError(res, result);

    return res.status(200).json(result);
  } catch {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
  }
});

app.put('/orders/recurring/:id/instance/:position', async (req, res) => {
  const apiKey = getApiKeyFromAuthorizationHeader(req) as string | undefined;
  if (!apiKey || !await apiKeyValidation(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const userId = await getUserId(apiKey);
  if (!userId) {
    return res.status(403).json({ error: 'API key does not belong to user' });
  }

  const result = await editInstance(req.params.id, userId, Number(req.params.position), req.body);
  return res.status(result.status).json(result.body);
});

export default app;