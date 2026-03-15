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

describe('/orders/:id/xml (GET)', () => {
  beforeEach(async () => {
    await clearOrderTestData();
    await seedDefaultUserMap();
  });

  afterEach(async () => {
    await clearOrderTestData();
  });

  test('should return 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/orders/any-id/xml');
    expect(res.status).toStrictEqual(401);
  });

  test('should return 401 when the Authorization header contains an invalid API key', async () => {
    const res = await request(app)
      .get('/orders/any-id/xml')
      .set('Authorization', 'invalid-key');

    expect(res.status).toStrictEqual(401);
  });

  test('should return 400 when the specified order ID does not exist', async () => {
    const res = await request(app)
      .get('/orders/nonexistent/xml')
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toStrictEqual(400);
    expect(res.body.error?.toString()).toContain('Order does not exist');
  });

  test('should return 400 when the order exists but no XML record is stored for it', async () => {
    const orderId = await createOrder(VALID_API_KEY);
    await OrderXml.deleteOne({ orderId });

    const res = await request(app)
      .get(`/orders/${orderId}/xml`)
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toStrictEqual(400);
    expect(res.body.error?.toString()).toContain('Order does not exist');
  });

  test('should return 403 when the order exists but belongs to another user', async () => {
    await createUserMap(OTHER_API_KEY, OTHER_USER_ID);
    const orderId = await createOrder(OTHER_API_KEY);

    const res = await request(app)
      .get(`/orders/${orderId}/xml`)
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toStrictEqual(403);
  });

  test('should return 200 and the stored XML when the request is valid', async () => {
    const orderId = await createOrder(VALID_API_KEY);
    const storedXml = await OrderXml.findOne({ orderId });

    const res = await request(app)
      .get(`/orders/${orderId}/xml`)
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toStrictEqual(200);
    expect(res.headers['content-type']).toContain('application/xml');
    expect(res.text).toStrictEqual(storedXml?.xml);
    expect(res.text).toContain('<Order');
  });
});
