import crypto from 'crypto';
import request from "supertest";
import app from "../src/app";
import OrderModel from "../src/models/order";
import OrderXml from "../src/models/orderXml";
import { UserMap } from '../src/models/userMap';
import type { Order } from '../src/types';

const VALID_API_KEY = "test-api-key";
const VALID_USER_ID = "test-user";

function buildValidOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-default',
    userId: VALID_USER_ID,
    issueDate: '2026-03-15',
    documentCurrencyCode: 'USD',
    buyerCustomerParty: {
      party: {
        partyName: 'Buyer Pty Ltd',
        postalAddress: {
          streetName: '1 Buyer St',
          cityName: 'Sydney',
          postalZone: '2000',
          country: 'AU',
        },
      },
    },
    sellerSupplierParty: {
      party: {
        partyName: 'Seller Pty Ltd',
        postalAddress: {
          streetName: '2 Seller St',
          cityName: 'Melbourne',
          postalZone: '3000',
          country: 'AU',
        },
      },
    },
    orderLines: [
      {
        lineItem: {
          id: 'line-1',
          quantity: 2,
          unitCode: 'EA',
          lineExtensionAmount: 20,
          price: {
            priceAmount: 10,
            currencyID: 'USD',
          },
          item: {
            name: 'Chalk',
          },
        },
      },
    ],
    anticipatedMonetaryTotal: {
      lineExtensionAmount: 20,
      taxExclusiveAmount: 20,
      taxInclusiveAmount: 20,
      allowanceTotalAmount: 0,
      chargeTotalAmount: 0,
      payableAmount: 20,
    },
    createdAt: new Date().toISOString(),
    xmlUrl: '/orders/order-default/xml',
    ...overrides,
  };
}

describe('/orders/:id (PUT)', () => {
  beforeEach(async () => {
    await OrderModel.deleteMany({});
    await OrderXml.deleteMany({});
    await UserMap.deleteMany({});

    const hashedKey = crypto.createHash('sha256').update(VALID_API_KEY).digest('hex');
    await UserMap.create({
      userId: VALID_USER_ID,
      apiKey: hashedKey,
    });
  });

  afterEach(async () => {
    await OrderModel.deleteMany({});
    await OrderXml.deleteMany({});
    await UserMap.deleteMany({});
  });

  test('responds 401 when no Authorization header is provided', async () => {
    const res = await request(app).put('/orders/any-id').send({ note: "x" });
    expect(res.status).toBe(401);
  });

  test('responds 401 when Authorization header contains an invalid API key', async () => {
    const res = await request(app)
      .put('/orders/any-id')
      .set('Authorization', 'invalid-key')
      .send({ note: "x" });
    expect(res.status).toBe(401);
  });

  test('responds 400 when the specified order ID does not exist', async () => {
    const res = await request(app)
      .put('/orders/nonexistent')
      .set('Authorization', VALID_API_KEY)
      .send({ note: "x" });

    expect(res.status).toBe(400);
    expect(res.body.error?.toString()).toContain('Order does not exist');
  });

  test('responds 403 when the order exists but belongs to another user', async () => {
    const order = await OrderModel.create(buildValidOrder({
      id: 'order-1',
      userId: 'other-user',
      xmlUrl: '/orders/order-1/xml',
    }));

    const res = await request(app)
      .put(`/orders/${order.id}`)
      .set('Authorization', VALID_API_KEY)
      .send({ note: "updated-note" });

    expect(res.status).toBe(403);
  });

  test('responds 200 and returns the updated order when request is valid', async () => {
    const order = await OrderModel.create(buildValidOrder({
      id: 'order-2',
      xmlUrl: '/orders/order-2/xml',
    }));

    const res = await request(app)
      .put(`/orders/${order.id}`)
      .set('Authorization', VALID_API_KEY)
      .send({ note: "updated-note" });

    expect(res.status).toBe(200);
    expect(res.body.note).toBe("updated-note");
  });

  test('persists updated XML for the order after a successful update', async () => {
    const order = await OrderModel.create(buildValidOrder({
      id: 'order-3',
      xmlUrl: '/orders/order-3/xml',
    }));

    await OrderXml.create({ orderId: order.id, xml: "<old/>" });

    const res = await request(app)
      .put(`/orders/${order.id}`)
      .set('Authorization', VALID_API_KEY)
      .send({ note: "updated-note" });

    expect(res.status).toBe(200);

    const storedXml = await OrderXml.findOne({ orderId: order.id });
    expect(storedXml).toBeTruthy();
    expect(storedXml?.xml).toContain("<Order");
  });
});
