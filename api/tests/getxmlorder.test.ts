import crypto from 'crypto';
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import OrderModel from '../src/models/order';
import OrderXml from '../src/models/orderXml';
import { UserMap } from '../src/models/userMap';
import type { Order } from '../src/types';

const VALID_API_KEY = 'test-api-key';
const VALID_USER_ID = 'test-user';
const OTHER_API_KEY = 'other-api-key';
const OTHER_USER_ID = 'other-user';

type CreateOrderPayload = Omit<
  Order,
  'id' | 'userId' | 'anticipatedMonetaryTotal' | 'createdAt' | 'updatedAt' | 'xmlUrl'
>;

function buildValidOrderPayload(overrides: Partial<CreateOrderPayload> = {}): CreateOrderPayload {
  return {
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
    ...overrides,
  };
}

async function createUserMap(apiKey: string, userId: string): Promise<void> {
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
  await UserMap.create({ userId, apiKey: hashedKey });
}

async function createOrder(apiKey = VALID_API_KEY, overrides: Partial<CreateOrderPayload> = {}) {
  const res = await request(app)
    .post('/orders')
    .set('Authorization', apiKey)
    .send(buildValidOrderPayload(overrides));

  expect(res.status).toBe(200);
  return res.body.id as string;
}

describe('/orders/:id/xml (GET)', () => {
  beforeEach(async () => {
    await OrderModel.deleteMany({});
    await OrderXml.deleteMany({});
    await UserMap.deleteMany({});

    await createUserMap(VALID_API_KEY, VALID_USER_ID);
  });

  afterEach(async () => {
    await OrderModel.deleteMany({});
    await OrderXml.deleteMany({});
    await UserMap.deleteMany({});
  });

  test('responds 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/orders/any-id/xml');
    expect(res.status).toBe(401);
  });

  test('responds 401 when Authorization header contains an invalid API key', async () => {
    const res = await request(app)
      .get('/orders/any-id/xml')
      .set('Authorization', 'invalid-key');

    expect(res.status).toBe(401);
  });

  test('responds 400 when the specified order ID does not exist', async () => {
    const res = await request(app)
      .get('/orders/nonexistent/xml')
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toBe(400);
    expect(res.body.error?.toString()).toContain('Order does not exist');
  });

  test('responds 400 when the order exists but no XML record is stored for it', async () => {
    const orderId = await createOrder();
    await OrderXml.deleteOne({ orderId });

    const res = await request(app)
      .get(`/orders/${orderId}/xml`)
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toBe(400);
    expect(res.body.error?.toString()).toContain('Order does not exist');
  });

  test('responds 403 when the order exists but belongs to another user', async () => {
    await createUserMap(OTHER_API_KEY, OTHER_USER_ID);
    const orderId = await createOrder(OTHER_API_KEY);

    const res = await request(app)
      .get(`/orders/${orderId}/xml`)
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toBe(403);
  });

  test('responds 200 and returns the stored XML when request is valid', async () => {
    const orderId = await createOrder();
    const storedXml = await OrderXml.findOne({ orderId });

    const res = await request(app)
      .get(`/orders/${orderId}/xml`)
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/xml');
    expect(res.text).toBe(storedXml?.xml);
    expect(res.text).toContain('<Order');
  });
});
