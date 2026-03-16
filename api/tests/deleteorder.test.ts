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

describe('/orders/:id (DELETE)', () => {
  beforeEach(async () => {
    await clearOrderTestData();
    await seedDefaultUserMap();
  });

  afterEach(async () => {
    await clearOrderTestData();
  });

  describe('authentication and ownership errors', () => {
    test('should return 401 when no Authorization header is provided', async () => {
      const res = await request(app).delete('/orders/any-id');

      expect(res.status).toStrictEqual(401);
      expect(res.body).toStrictEqual({ error: expect.any(String), message: expect.any(String) });
    });

    test('should return 401 when the Authorization header contains an invalid API key', async () => {
      const res = await request(app)
        .delete('/orders/any-id')
        .set('Authorization', 'invalid-key');

      expect(res.status).toStrictEqual(401);
      expect(res.body).toStrictEqual({ error: expect.any(String), message: expect.any(String) });
    });

    test('should return 400 when the specified order ID does not exist for this user', async () => {
      const orderId = await createOrder(VALID_API_KEY);
      await createOrder(VALID_API_KEY);

      const res = await request(app)
        .delete(`/orders/${orderId + 'invalid'}`)
        .set('Authorization', VALID_API_KEY);

      expect(res.status).toStrictEqual(400);
      expect(res.body).toStrictEqual({ error: expect.any(String), message: expect.any(String) });
    });

    test('should return 400 when the order exists but belongs to another user', async () => {
      await createUserMap(OTHER_API_KEY, OTHER_USER_ID);
      const otherOrderId = await createOrder(OTHER_API_KEY);

      const res = await request(app)
        .delete(`/orders/${otherOrderId}`)
        .set('Authorization', VALID_API_KEY);

      expect(res.status).toStrictEqual(400);
      expect(res.body).toStrictEqual({ error: expect.any(String), message: expect.any(String) });
    });
  });

  describe('successful deletion', () => {
    test('should return 200 and delete both the order and its XML when the request is valid', async () => {
      const orderId = await createOrder(VALID_API_KEY);
      const res = await request(app)
        .delete(`/orders/${orderId}`)
        .set('Authorization', VALID_API_KEY);

      expect(res.status).toStrictEqual(200);
      expect(res.body).toStrictEqual({ message: expect.any(String) });

      const xmlAfter = await OrderXml.findOne({ orderId });
      expect(xmlAfter).toBeNull();
    });
  });
});

