import express from 'express';
import { apiKeyValidation, validateOrder, calculateMonetaryTotal } from './utils/validation';
import type { OrderResponse, Order } from './types';

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

  const order: OrderResponse = {
    id: crypto.randomUUID(),
    issueDate: new Date().toISOString().slice(0, 10),
    documentCurrencyCode: req.body.documentCurrencyCode,
    buyerCustomerParty: req.body.buyerCustomerParty,
    sellerSupplierParty: req.body.sellerSupplierParty,
    orderLines: req.body.orderLines,
    anticipatedMonetaryTotal: calculateMonetaryTotal(req.body),
    createdAt: new Date(),
    xmlUrl: `/orders/${req.body.id}/xml`
  }

  return res.status(200).json(order);
});

export default app;
