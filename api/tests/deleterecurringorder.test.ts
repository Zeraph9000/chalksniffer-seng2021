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

describe('/orders/instance/:id (DELETE)', () => {
  beforeEach(async () => {
    await clearOrderTestData();
    await seedDefaultUserMap();
  });

  afterEach(async () => {
    await clearOrderTestData();
  });

  describe('authentication and ownership errors', () => {
    test('should return 401 when no Authorization header is provided', async () => {
      const res = await request(app).delete('/orders/instance/any-id');

      expect(res.status).toStrictEqual(401);
    });

    test('should return 401 when the Authorization header contains an invalid API key', async () => {
      const res = await request(app)
        .delete('/orders/instance/any-id')
        .set('Authorization', 'invalid-key');

      expect(res.status).toStrictEqual(401);
    });

    test('should return 400 when the recurring order ID does not exist', async () => {
      const res = await request(app)
        .delete('/orders/instance/nonexistent-id')
        .set('Authorization', VALID_API_KEY);

      expect(res.status).toStrictEqual(400);
      expect(res.body.error).toContain('User does not own a recurring order with the ID nonexistent-id');
    });

    test('should return 400 when the recurring order belongs to another user', async () => {
      await createUserMap(OTHER_API_KEY, OTHER_USER_ID);
      const otherRecurringOrderId = await createRecurringOrder(OTHER_API_KEY);

      const res = await request(app)
        .delete(`/orders/instance/${otherRecurringOrderId}`)
        .set('Authorization', VALID_API_KEY);

      expect(res.status).toStrictEqual(400);
      expect(res.body.error).toContain(`User does not own a recurring order with the ID ${otherRecurringOrderId}`);
    });
  });

  describe('successful deletion', () => {
    test('should return 200 and delete the recurring order', async () => {
      const recurringOrderId = await createRecurringOrder(VALID_API_KEY);

      const res = await request(app)
        .delete(`/orders/instance/${recurringOrderId}`)
        .set('Authorization', VALID_API_KEY);

      expect(res.status).toStrictEqual(200);
      expect(res.body).toStrictEqual({ message: `Recurring order ${recurringOrderId} deleted successfully` });

      const found = await RecurringOrderModel.findOne({ id: recurringOrderId });
      expect(found).toBeNull();
    });
  });
});
