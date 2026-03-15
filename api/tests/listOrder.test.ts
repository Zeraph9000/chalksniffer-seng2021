import request from 'supertest';
import app from '../src/app';
import { UserMap } from '../src/models/userMap';
import { createUserMap, createOrder, buildValidOrderPayload } from '../tests/testHelpers';
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import OrderModel from '../src/models/order';
import OrderXml from '../src/models/orderXml';

const VALID_API_KEY = 'test-api-key';
const VALID_USER_ID = 'test-user';
const OTHER_API_KEY = 'other-api-key';
const OTHER_USER_ID = 'other-user';

describe('/orders (GET)', () => {
  beforeEach(async () => {
    await OrderModel.deleteMany({});
    await OrderXml.deleteMany({});
    await UserMap.deleteMany({});

    await createUserMap(VALID_API_KEY, VALID_USER_ID);
  });

  test('responds 401 when no Authorization header is provided', async () => {
    const res = await request(app)
      .get('/orders')
      .send({ limit: 3, offset: 0 });

    expect(res.status).toBe(401);
  });

  test('responds 200 and returns paginated orders for the authenticated user', async () => {
    const payload = buildValidOrderPayload();
    const orderId = await createOrder(VALID_API_KEY, payload);
    await createOrder(VALID_API_KEY, payload);

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
    const payload = buildValidOrderPayload();
    const orderId = await createOrder(VALID_API_KEY, payload);

    await createUserMap(OTHER_API_KEY, OTHER_USER_ID);
    await createOrder(OTHER_API_KEY, payload);

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
