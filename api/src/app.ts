import express from 'express';
import { router as authRouter } from './auth/auth';
import OrderXml from './models/orderXml';
import OrderModel from './models/order';
import { validateOrder } from './utils/validation';
import { calculateMonetaryTotal } from './utils/orderCalculations';
import { buildOrderXml } from './utils/xmlBuilder';
import { apiKeyValidation } from './auth/auth';
import { Order, OrderResponse } from './types';

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

app.put ('/orders/:id', (req, res) => {
  const auth = req.headers.authorization;
  const id = req.params.id;
  let body = req.body as {
  note: string,
  delivery: {
    requestedDeliveryPeriod: {
      startDate: string,
      endDate: string
    }
  },
  orderLines: [
    {
      lineItem: {
        id: string,
        quantity: number,
        unitCode: string,
        price: { priceAmount: number, currencyID: string },
        item: { name: string, sellersItemIdentification: string }
      }
    }
  ]
}

})

export default app;
