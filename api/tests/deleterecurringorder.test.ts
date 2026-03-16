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

describe('DELETE /orders/:id/instances/:position', () => {
  beforeEach(async () => {
    await clearOrderTestData();
    await seedDefaultUserMap();
  });

  afterEach(async () => {
    await clearOrderTestData();
  });

  test('should return 401 when no Authorization header is provided', async () => {
    const res = await request(app).delete('/orders/any-id/instances/0');
    expect(res.status).toStrictEqual(401);
  });

  test('should return 401 when the API key is invalid', async () => {
    const res = await request(app)
      .delete('/orders/any-id/instances/0')
      .set('Authorization', 'invalid-key');
    expect(res.status).toStrictEqual(401);
  });

  test('should return 400 when recurring order ID does not exist', async () => {
    const res = await request(app)
      .delete('/orders/nonexistent-id/instances/0')
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toStrictEqual(400);
    expect(res.body.error).toContain('nonexistent-id');
  });

  test('should return 400 when the recurring order belongs to another user', async () => {
    await createUserMap(OTHER_API_KEY, OTHER_USER_ID);
    const otherRecurringOrderId = await createRecurringOrder(OTHER_API_KEY);

    const res = await request(app)
      .delete(`/orders/${otherRecurringOrderId}/instances/0`)
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toStrictEqual(400);
    expect(res.body.error).toContain(otherRecurringOrderId);
  });

  test('should return 400 when position is out of bounds', async () => {
    const recurringOrderId = await createRecurringOrder(VALID_API_KEY);

    const res = await request(app)
      .delete(`/orders/${recurringOrderId}/instances/99`)
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toStrictEqual(400);
    expect(res.body.error).toContain('99');
  });

  test('should return 400 when position is not a valid integer', async () => {
    const recurringOrderId = await createRecurringOrder(VALID_API_KEY);

    const res = await request(app)
      .delete(`/orders/${recurringOrderId}/instances/abc`)
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toStrictEqual(400);
    expect(res.body.error).toContain('abc');
  });

  test('should return 200 and remove only the instance at the given position', async () => {
    const recurringOrderId = await createRecurringOrder(VALID_API_KEY);

    const before = await RecurringOrderModel.findOne({ id: recurringOrderId });
    expect(before).not.toBeNull();
    const instancesBefore = before!.orderInstances.length;
    const targetInstanceId = before!.orderInstances[0].id;

    const res = await request(app)
      .delete(`/orders/${recurringOrderId}/instances/0`)
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toStrictEqual(200);
    expect(res.body.message).toContain('position 0');

    const after = await RecurringOrderModel.findOne({ id: recurringOrderId });
    expect(after).not.toBeNull();
    expect(after!.orderInstances.length).toStrictEqual(instancesBefore - 1);
    expect(after!.orderInstances.find((i: any) => i.id === targetInstanceId)).toBeUndefined();
  });
});
