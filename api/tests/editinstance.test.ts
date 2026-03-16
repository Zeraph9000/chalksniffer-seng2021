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

describe('/order/instance/:id (PUT)', () => {
  beforeEach(async () => {
    await clearOrderTestData();
    await seedDefaultUserMap();
  });

  afterEach(async () => {
    await clearOrderTestData();
  });

  describe('authentication and ownership errors', () => {
    test('should return 401 when no Authorization header is provided', async () => {
      const res = await request(app).put('/order/instance/any-id');
      expect(res.status).toStrictEqual(401);
    });

    test('should return 401 when the Authorization header contains an invalid API key', async () => {
      const res = await request(app)
        .put('/order/instance/any-id')
        .set('Authorization', 'invalid-key');
      expect(res.status).toStrictEqual(401);
    });

    test('should return 400 when the recurring order ID does not exist', async () => {
      const res = await request(app)
        .put('/order/instance/nonexistent-id')
        .set('Authorization', VALID_API_KEY)
        .send({ note: 'test' });
      expect(res.status).toStrictEqual(400);
      expect(res.body.error).toContain('Recurring order does not exist');
    });

    test('should return 403 when the recurring order belongs to another user', async () => {
      await createUserMap(OTHER_API_KEY, OTHER_USER_ID);
      const otherRecurringOrderId = await createRecurringOrder(OTHER_API_KEY);

      const res = await request(app)
        .put(`/order/instance/${otherRecurringOrderId}`)
        .set('Authorization', VALID_API_KEY)
        .send({ note: 'test' });
      expect(res.status).toStrictEqual(403);
      expect(res.body.error).toContain('user does not own requested recurring order');
    });
  });

  describe('empty instances', () => {
    test('should return 400 when recurring order has no pending instances', async () => {
      const recurringOrderId = await createRecurringOrder(VALID_API_KEY);
      // Remove all instances
      await RecurringOrderModel.updateOne({ id: recurringOrderId }, { orderInstances: [] });

      const res = await request(app)
        .put(`/order/instance/${recurringOrderId}`)
        .set('Authorization', VALID_API_KEY)
        .send({ note: 'test' });
      expect(res.status).toStrictEqual(400);
      expect(res.body.error).toContain('No pending instances to edit');
    });
  });

  describe('successful edits', () => {
    test('should return 200 and update note on next instance', async () => {
      const recurringOrderId = await createRecurringOrder(VALID_API_KEY);

      const res = await request(app)
        .put(`/order/instance/${recurringOrderId}`)
        .set('Authorization', VALID_API_KEY)
        .send({ note: 'Updated note' });

      expect(res.status).toStrictEqual(200);
      expect(res.body.order.note).toStrictEqual('Updated note');
    });

    test('should return 200 and update orderLines on next instance', async () => {
      const recurringOrderId = await createRecurringOrder(VALID_API_KEY);
      const newOrderLines = [
        {
          lineItem: {
            id: 'line-2',
            quantity: 5,
            unitCode: 'EA',
            price: { priceAmount: 20, currencyID: 'USD' },
            item: { name: 'Eraser' },
          },
        },
      ];

      const res = await request(app)
        .put(`/order/instance/${recurringOrderId}`)
        .set('Authorization', VALID_API_KEY)
        .send({ orderLines: newOrderLines });

      expect(res.status).toStrictEqual(200);
      expect(res.body.order.orderLines).toHaveLength(1);
      expect(res.body.order.orderLines[0].lineItem.item.name).toStrictEqual('Eraser');
      expect(res.body.order.anticipatedMonetaryTotal.payableAmount).toStrictEqual(100);
    });

    test('should return 200 and update delivery on next instance', async () => {
      const recurringOrderId = await createRecurringOrder(VALID_API_KEY);
      const newDelivery = {
        deliveryAddress: {
          streetName: '99 New St',
          cityName: 'Brisbane',
          postalZone: '4000',
          country: 'AU',
        },
      };

      const res = await request(app)
        .put(`/order/instance/${recurringOrderId}`)
        .set('Authorization', VALID_API_KEY)
        .send({ delivery: newDelivery });

      expect(res.status).toStrictEqual(200);
      expect(res.body.order.delivery.deliveryAddress.cityName).toStrictEqual('Brisbane');
    });

    test('should only modify the first instance, leaving others unchanged', async () => {
      const recurringOrderId = await createRecurringOrder(VALID_API_KEY);

      const before = await RecurringOrderModel.findOne({ id: recurringOrderId });
      const secondInstanceBefore = JSON.parse(JSON.stringify(before!.orderInstances[1]));

      await request(app)
        .put(`/order/instance/${recurringOrderId}`)
        .set('Authorization', VALID_API_KEY)
        .send({ note: 'Only first instance' });

      const after = await RecurringOrderModel.findOne({ id: recurringOrderId });
      expect(after!.orderInstances[0].order.note).toStrictEqual('Only first instance');
      expect(after!.orderInstances[1].order.note).toStrictEqual(secondInstanceBefore.order.note);
    });
  });

  describe('validation failure', () => {
    test('should return 400 when edited instance fails validation', async () => {
      const recurringOrderId = await createRecurringOrder(VALID_API_KEY);

      const res = await request(app)
        .put(`/order/instance/${recurringOrderId}`)
        .set('Authorization', VALID_API_KEY)
        .send({ orderLines: [] });

      expect(res.status).toStrictEqual(400);
      expect(res.body.errors).toBeDefined();
    });
  });

  describe('updateTemplate flag', () => {
    test('should update template order when updateTemplate is true', async () => {
      const recurringOrderId = await createRecurringOrder(VALID_API_KEY);

      const res = await request(app)
        .put(`/order/instance/${recurringOrderId}`)
        .set('Authorization', VALID_API_KEY)
        .send({ note: 'Template updated too', updateTemplate: true });

      expect(res.status).toStrictEqual(200);

      const saved = await RecurringOrderModel.findOne({ id: recurringOrderId });
      expect(saved!.order.note).toStrictEqual('Template updated too');
      expect(saved!.orderInstances[0].order.note).toStrictEqual('Template updated too');
    });

    test('should NOT update template order when updateTemplate is not set', async () => {
      const recurringOrderId = await createRecurringOrder(VALID_API_KEY);

      const before = await RecurringOrderModel.findOne({ id: recurringOrderId });
      const templateNoteBefore = before!.order.note;

      const res = await request(app)
        .put(`/order/instance/${recurringOrderId}`)
        .set('Authorization', VALID_API_KEY)
        .send({ note: 'Instance only' });

      expect(res.status).toStrictEqual(200);

      const after = await RecurringOrderModel.findOne({ id: recurringOrderId });
      expect(after!.order.note).toStrictEqual(templateNoteBefore);
      expect(after!.orderInstances[0].order.note).toStrictEqual('Instance only');
    });
  });
});
