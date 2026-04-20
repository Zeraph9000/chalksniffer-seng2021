import express, { Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { router as authRouter } from './auth/auth';
import OrderModel from './models/order';
import { parsePagedQuery } from './utils/orderHelpers';
import { getOrderXmlResponse } from './utils/getOrderXml';
import { editOrderFmt, store } from './types';
import { handleError } from './utils/httpErrors';
import { deleteOrder, createOrder, updateOrder, listOrders, getOrder, getOrderCSV } from './orders/orderService';
import { editRecurringOrder, createRecurringOrder, deleteRecurringOrder, deleteRecurringOrderInstance, editInstance, getRecurringOrder, getRecurringOrderInstance, processAllRecurringOrders } from './orders/recurringOrderService';
import { getApiKeyFromAuthorizationHeader, getUserIdFromApiKey } from './utils/serverHelpers';
import { createStore, editStore } from './stores/storeService';
import StoreModel from './models/store';

const app = express();
app.use(cors());

const yamlPath = process.env.VERCEL
  ? path.join(process.cwd(), 'api/endpoints.yaml')
  : path.join(__dirname, '../endpoints.yaml');
const swaggerDocument = YAML.load(yamlPath);
const swaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .opblock .opblock-summary-path-description-wrapper { align-items: center; display: flex; flex-wrap: wrap; gap: 0 10px; padding: 0 10px; width: 100%; }',
  customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui.min.css',
};
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerUiOptions));

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
  try {
    const result = await getOrderXmlResponse(
      getApiKeyFromAuthorizationHeader(req) as string | undefined,
      req.params.id as string
    );

    if (result.status !== 200) {
      return res.status(result.status).json(result.body);
    }

    res.set('Content-Type', 'application/xml');
    return res.status(200).send(result.xml);
  } catch {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
  }
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
    if ('error' in result) return res.status(400).json(result);

    res.status(200).json(result);
  } catch {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Failed to process recurring orders' });
  }
});

app.get('/orders/recurring/:id', async (req, res) => {
  try {
    const result = await getUserIdFromApiKey(req);
    if ('error' in result) return handleError(res, result);
    const userId = result.userId;
    const id = req.params.id as string;

    const orderRes = await getRecurringOrder(userId, id);
    if ('error' in orderRes) return handleError(res, orderRes);

    res.status(200).json(orderRes);
  } catch {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Failed to get recurring order' });
  }
});

app.get('/orders/recommend', async (req, res) => {
  try {
    const authResult = await getUserIdFromApiKey(req);
    if ('error' in authResult) return handleError(res, authResult);

    const orders = await OrderModel.find({ userId: authResult.userId }).lean();

    const normalizedKeys = orders.map((o) => {
      const items = o.orderLines?.map(line => `${line.lineItem.item.name}:${line.lineItem.quantity}`).sort() || [];
      return items.join('|');
    });

    const freq = new Map<string, number>();
    for (const key of normalizedKeys) {
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

    if (mostFreqKey == null || mostFreqCount < 2) {
      return res.status(400).json({ error: 'INVALID_RECOMMENDATION', message: 'No frequent orders found' });
    }

    const mostFreqOrder = orders.find((o) => {
      const items = o.orderLines?.map(line => `${line.lineItem.item.name}:${line.lineItem.quantity}`).sort() || [];
      return items.join('|') === mostFreqKey;
    });

    return res.status(200).json(mostFreqOrder);
  } catch {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
  }
});

app.get('/orders/:id', async (req, res) => {
  try {
    const result = await getUserIdFromApiKey(req);
    if ('error' in result) return handleError(res, result);
    const userId = result.userId;
    const id = req.params.id as string;

    const orderRes = await getOrder(userId, id);
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

app.get('/orders/recurring/:id/instance/:position', async (req, res) => {
  try {
    const authResult = await getUserIdFromApiKey(req);
    if ('error' in authResult) return handleError(res, authResult);

    const result = await getRecurringOrderInstance(req.params.id, authResult.userId, req.params.position);
    return res.status(result.status).json(result.body);
  } catch {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
  }
});

app.delete('/orders/recurring/:id/instance/:position', async (req, res) => {
  try {
    const authResult = await getUserIdFromApiKey(req);
    if ('error' in authResult) return handleError(res, authResult);

    const result = await deleteRecurringOrderInstance(authResult.userId, req.params.id, req.params.position);
    return res.status(result.status).json(result.body);
  } catch {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
  }
});

app.put('/orders/recurring/:id', async (req, res) => {
  try {
    const authResult = await getUserIdFromApiKey(req);
    if ('error' in authResult) return handleError(res, authResult);

    const result = await editRecurringOrder(req.params.id, authResult.userId, req.body);
    return res.status(result.status).json(result.body);
  } catch {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
  }
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
  try {
    const authResult = await getUserIdFromApiKey(req);
    if ('error' in authResult) return handleError(res, authResult);

    const result = await editInstance(req.params.id, authResult.userId, Number(req.params.position), req.body);
    return res.status(result.status).json(result.body);
  } catch {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
  }
});

app.post('/stores', async (req, res) => {
  try {
    const authResult = await getUserIdFromApiKey(req);
    if ('error' in authResult) return handleError(res, authResult);
    const userId = authResult.userId;
    const storeDetails = req.body as store;
    const store = await createStore(userId, storeDetails);
    if ('error' in store) return handleError(res, store);

    return res.status(201).json(store);
  } catch {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
  }
});

// Add filters later if possible
app.get('/stores', async (req, res) => {
  try {
    const authResult = await getUserIdFromApiKey(req);
    if ('error' in authResult) return handleError(res, authResult);
    const stores = await StoreModel.find({ status: { $ne: 'closed' } });
    return res.status(200).json(stores);
  } catch {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
  }
});

app.get('/stores/me', async (req, res) => {
  try {
    const authResult = await getUserIdFromApiKey(req);
    if ('error' in authResult) return handleError(res, authResult);

    const userId = authResult.userId;

    const store = await StoreModel.findOne({ userId });

    if (!store) {
      return res.status(404).json({ error: 'Not Found', message: 'You don\'t own a store' });
    } else {
      return res.status(200).json(store);
    }
  } catch {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
  }
});

app.get('/stores/:storeId', async (req, res) => {
  try {
    const authResult = await getUserIdFromApiKey(req);
    if ('error' in authResult) return handleError(res, authResult);

    const storeId = req.params.storeId;

    const store = await StoreModel.findOne({ storeId });
    if (!store) {
      return res.status(404).json({ error: 'Not Found', message: 'Store does not exist' });
    } else {
      return res.status(200).json(store);
    }
  } catch {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
  }
});

app.put('/stores/:storeId', async (req, res) => {
  try {
    const authResult = await getUserIdFromApiKey(req);
    if ('error' in authResult) return handleError(res, authResult);
    const storeId = req.params.storeId;
    const store = await StoreModel.findOne({ storeId });
    if (!store) {
      return res.status(404).json({ error: 'Not Found', message: 'Store does not exist' });
    }
    if (authResult.userId != store.userId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'This store does not belong to you' });
    }
    const updStore = await editStore(store, req.body);
    if ('error' in updStore) return handleError(res, updStore);

    await store.save();

    return res.status(200).json(updStore);
  } catch {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
  }
});

app.put('/stores/:storeId/status', async (req, res) => {
  try {
    const authResult = await getUserIdFromApiKey(req);
    if ('error' in authResult) return handleError(res, authResult);

    const status = req.body;

    if (status.status != 'active' && status.status != 'paused' && status.status != 'closed') {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid status value' });
    }

    const storeId = req.params.storeId;

    const store = await StoreModel.findOne({ storeId });

    if (!store) {
      return res.status(404).json({ error: 'Not Found', message: 'Store does not exist' });
    }
    if (authResult.userId != store.userId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'This store does not belong to you' });
    }

    const now: Date = new Date();

    store.status = status.status;

    store.updatedAt = now;

    await store.save();

    return res.status(200).json(store);
  } catch {
    res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' });
  }
});

export default app;
