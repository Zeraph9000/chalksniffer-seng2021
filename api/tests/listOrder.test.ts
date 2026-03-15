import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import OrderXml from '../src/models/orderXml';
import {
  clearOrderTestData,
  createOrder,
  createUserMap,
  OTHER_API_KEY,
  OTHER_USER_ID,
  seedDefaultUserMap,
  VALID_API_KEY,
} from './helpers/orderTestHelpers';

describe('/orders (GET)', () => {
  beforeEach(async () => {
    await clearOrderTestData();
    await seedDefaultUserMap();
  });

  afterEach(async () => {
    await clearOrderTestData();
  });

  test('responds 401 when no Authorization header is provided', async () => {
    const res = await request(app)
      .get('/orders')
      .send({ limit: 3, offset: 0 });

    expect(res.status).toBe(401);
  });

  test('responds 200 and returns limited paginated orders for the authenticated user', async () => {
    const orderId = await createOrder(VALID_API_KEY);
    await createOrder(VALID_API_KEY);

    const res = await request(app)
      .get('/orders')
      .set('Authorization', VALID_API_KEY)
      .send({ limit: 1, offset: 0 });

    expect(res.status).toBe(200);
    expect(res.body).toStrictEqual({
      limit: 1,
      totalOrders: 2,
      orders: [
        {
          id: orderId,
          issueDate: '2026-03-15',
          buyerName: 'Buyer Pty Ltd',
          sellerName: 'Seller Pty Ltd',
          payableAmount: 20,
          documentCurrencyCode: 'USD',
          createdAt: expect.any(String),
        }
      ]
    });
  });

  test('responds 200 and filters by order id and excludes other users', async () => {
    const orderId = await createOrder(VALID_API_KEY);

    await createUserMap(OTHER_API_KEY, OTHER_USER_ID);
    await createOrder(OTHER_API_KEY);

    const res = await request(app)
      .get('/orders')
      .set('Authorization', VALID_API_KEY)
      .query({ id: orderId })
      .send({ limit: 10, offset: 0 });

    expect(res.status).toBe(200);
    expect(res.body).toStrictEqual({
      limit: 10,
      totalOrders: 1,
      orders: [
        {
          id: orderId,
          issueDate: '2026-03-15',
          buyerName: 'Buyer Pty Ltd',
          sellerName: 'Seller Pty Ltd',
          payableAmount: 20,
          documentCurrencyCode: 'USD',
          createdAt: expect.any(String),
        }
      ]
    });
  });
});
