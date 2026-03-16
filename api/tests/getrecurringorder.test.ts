import request from 'supertest';
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import app from '../src/app';
import {
  buildValidOrderPayload,
  clearOrderTestData,
  createUserMap,
  OTHER_API_KEY,
  OTHER_USER_ID,
  seedDefaultUserMap,
  VALID_API_KEY,
} from './helpers/orderTestHelpers';
import './setup';

async function createRecurringOrder(apiKey: string) {
  const payload = {
    ...buildValidOrderPayload(),
    recurring: true,
    frequency: 'Weekly',
    startDate: '2026-04-01T00:00:00.000Z',
  };

  const res = await request(app)
    .post('/orders')
    .set('Authorization', apiKey)
    .send(payload);

  expect(res.status).toStrictEqual(200);
  return res.body;
}

describe('GET /orders/recurring/:id', () => {
  beforeEach(async () => {
    await clearOrderTestData();
    await seedDefaultUserMap();
  });

  afterEach(async () => {
    await clearOrderTestData();
  });

  test('responds 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/orders/recurring/some-id');
    expect(res.status).toStrictEqual(401);
  });

  test('responds 401 when invalid API key is provided', async () => {
    const res = await request(app)
      .get('/orders/recurring/some-id')
      .set('Authorization', 'invalid-key');
    expect(res.status).toStrictEqual(401);
  });

  test('responds 400 when recurring order does not exist', async () => {
    const res = await request(app)
      .get('/orders/recurring/nonexistent-id')
      .set('Authorization', VALID_API_KEY);
    expect(res.status).toStrictEqual(400);
  });

  test('responds 403 when user does not own the recurring order', async () => {
    const created = await createRecurringOrder(VALID_API_KEY);

    await createUserMap(OTHER_API_KEY, OTHER_USER_ID);

    const res = await request(app)
      .get(`/orders/recurring/${created.id}`)
      .set('Authorization', OTHER_API_KEY);
    expect(res.status).toStrictEqual(403);
  });

  test('responds 200 with recurring order data and instance summaries', async () => {
    const created = await createRecurringOrder(VALID_API_KEY);

    const res = await request(app)
      .get(`/orders/recurring/${created.id}`)
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toStrictEqual(200);
    expect(res.body.id).toStrictEqual(created.id);
    expect(res.body.frequency).toStrictEqual('Weekly');
    expect(res.body.startDate).toStrictEqual('2026-04-01T00:00:00.000Z');
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.order).toBeDefined();
    expect(res.body.order.orderLines).toBeDefined();

    // Instance summaries should only have id and scheduledDate
    expect(Array.isArray(res.body.orderInstances)).toStrictEqual(true);
    expect(res.body.orderInstances.length).toBeGreaterThan(0);
    for (const instance of res.body.orderInstances) {
      expect(instance.id).toBeDefined();
      expect(instance.scheduledDate).toBeDefined();
      expect(instance.order).toBeUndefined();
    }
  });
});
