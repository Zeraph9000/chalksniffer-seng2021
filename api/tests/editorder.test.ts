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

describe('/orders/:id (PUT)', () => {
  beforeEach(async () => {
    await clearOrderTestData();
    await seedDefaultUserMap();
  });

  afterEach(async () => {
    await clearOrderTestData();
  });

  test('should return 401 when no Authorization header is provided', async () => {
    const res = await request(app).put('/orders/any-id').send({ note: 'x' });
    expect(res.status).toStrictEqual(401);
  });

  test('should return 401 when the Authorization header contains an invalid API key', async () => {
    const res = await request(app)
      .put('/orders/any-id')
      .set('Authorization', 'invalid-key')
      .send({ note: 'x' });
    expect(res.status).toStrictEqual(401);
  });

  test('should return 400 when the specified order ID does not exist', async () => {
    const res = await request(app)
      .put('/orders/nonexistent')
      .set('Authorization', VALID_API_KEY)
      .send({ note: 'x' });

    expect(res.status).toStrictEqual(400);
    expect(res.body.error?.toString()).toContain('Order does not exist');
  });

  test('should return 403 when the order exists but belongs to another user', async () => {
    await createUserMap(OTHER_API_KEY, OTHER_USER_ID);
    const orderId = await createOrder(OTHER_API_KEY);

    const res = await request(app)
      .put(`/orders/${orderId}`)
      .set('Authorization', VALID_API_KEY)
      .send({ note: 'updated-note' });

    expect(res.status).toStrictEqual(403);
  });

  test('should return 200 and the updated order when the request is valid', async () => {
    const orderId = await createOrder();

    const res = await request(app)
      .put(`/orders/${orderId}`)
      .set('Authorization', VALID_API_KEY)
      .send({ note: 'updated-note' });

    expect(res.status).toStrictEqual(200);
    expect(res.body.note).toStrictEqual('updated-note');
  });

  test('should persist updated XML when the request is valid', async () => {
    const orderId = await createOrder();

    const res = await request(app)
      .put(`/orders/${orderId}`)
      .set('Authorization', VALID_API_KEY)
      .send({ note: 'updated-note' });

    expect(res.status).toStrictEqual(200);

    const storedXml = await OrderXml.findOne({ orderId });
    expect(storedXml).toBeTruthy();
    expect(storedXml?.xml).toContain('<Order');
  });
});
