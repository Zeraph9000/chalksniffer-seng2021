import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import RecurringOrderModel from '../src/models/recurringOrder';
import {
  buildValidOrderPayload,
  clearOrderTestData,
  createUserMap,
  OTHER_API_KEY,
  OTHER_USER_ID,
  seedDefaultUserMap,
  VALID_API_KEY,
} from './helpers/orderTestHelpers';

async function createRecurringOrder(apiKey: string): Promise<string> {
  const res = await request(app)
    .post('/orders')
    .set('Authorization', apiKey)
    .send({
      ...buildValidOrderPayload(),
      recurring: true,
      frequency: 'Weekly',
      startDate: '2026-03-15T09:00:00Z',
    });

  expect(res.status).toStrictEqual(200);
  return res.body.id as string;
}

describe('GET /orders/recurring/:id/instance/:position', () => {
  beforeEach(async () => {
    await clearOrderTestData();
    await seedDefaultUserMap();
  });

  afterEach(async () => {
    await clearOrderTestData();
  });

  test('should return 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/orders/recurring/any-id/instance/0');
    expect(res.status).toStrictEqual(401);
  });

  test('should return 401 when the API key is invalid', async () => {
    const res = await request(app)
      .get('/orders/recurring/any-id/instance/0')
      .set('Authorization', 'invalid-key');
    expect(res.status).toStrictEqual(401);
  });

  test('should return 400 when recurring order ID does not exist', async () => {
    const res = await request(app)
      .get('/orders/recurring/nonexistent-id/instance/0')
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toStrictEqual(400);
    expect(res.body.error).toContain('does not exist');
  });

  test('should return 403 when the recurring order belongs to another user', async () => {
    await createUserMap(OTHER_API_KEY, OTHER_USER_ID);
    const otherRecurringOrderId = await createRecurringOrder(OTHER_API_KEY);

    const res = await request(app)
      .get(`/orders/recurring/${otherRecurringOrderId}/instance/0`)
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toStrictEqual(403);
    expect(res.body.error).toContain('does not own');
  });

  test('should return 400 when position is out of bounds', async () => {
    const recurringOrderId = await createRecurringOrder(VALID_API_KEY);

    const res = await request(app)
      .get(`/orders/recurring/${recurringOrderId}/instance/99`)
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toStrictEqual(400);
    expect(res.body.error).toContain('99');
  });

  test('should return 400 when position is not a valid integer', async () => {
    const recurringOrderId = await createRecurringOrder(VALID_API_KEY);

    const res = await request(app)
      .get(`/orders/recurring/${recurringOrderId}/instance/abc`)
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toStrictEqual(400);
    expect(res.body.error).toContain('abc');
  });

  test('should return 200 with the correct instance at position 0', async () => {
    const recurringOrderId = await createRecurringOrder(VALID_API_KEY);

    const recurringOrder = await RecurringOrderModel.findOne({ id: recurringOrderId });
    expect(recurringOrder).not.toBeNull();
    const expectedInstance = recurringOrder!.orderInstances[0];

    const res = await request(app)
      .get(`/orders/recurring/${recurringOrderId}/instance/0`)
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toStrictEqual(200);
    expect(res.body.id).toStrictEqual(expectedInstance.id);
    expect(res.body.order).toBeDefined();
    expect(res.body.scheduledDate).toBeDefined();
  });

  test('should return 200 with the correct instance at position 2', async () => {
    const recurringOrderId = await createRecurringOrder(VALID_API_KEY);

    const recurringOrder = await RecurringOrderModel.findOne({ id: recurringOrderId });
    expect(recurringOrder).not.toBeNull();
    const expectedInstance = recurringOrder!.orderInstances[2];

    const res = await request(app)
      .get(`/orders/recurring/${recurringOrderId}/instance/2`)
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toStrictEqual(200);
    expect(res.body.id).toStrictEqual(expectedInstance.id);
    expect(res.body.order).toBeDefined();
    expect(res.body.scheduledDate).toBeDefined();
  });

  test('should return response with id, order, and scheduledDate fields', async () => {
    const recurringOrderId = await createRecurringOrder(VALID_API_KEY);

    const res = await request(app)
      .get(`/orders/recurring/${recurringOrderId}/instance/0`)
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toStrictEqual(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('order');
    expect(res.body).toHaveProperty('scheduledDate');
  });
});
