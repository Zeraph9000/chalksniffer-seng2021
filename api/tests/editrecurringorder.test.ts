import { beforeEach, afterEach, describe, expect, test } from '@jest/globals';
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
import './setup';

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

describe('PUT /orders/recurring/:id', () => {
  beforeEach(async () => {
    await clearOrderTestData();
    await seedDefaultUserMap();
  });

  afterEach(async () => {
    await clearOrderTestData();
  });

  // Auth tests
  test('should return 401 when no Authorization header is provided', async () => {
    const res = await request(app).put('/orders/recurring/any-id').send({ note: 'test' });
    expect(res.status).toStrictEqual(401);
  });

  test('should return 401 when the API key is invalid', async () => {
    const res = await request(app)
      .put('/orders/recurring/any-id')
      .set('Authorization', 'invalid-key')
      .send({ note: 'test' });
    expect(res.status).toStrictEqual(401);
  });

  // Ownership tests
  test('should return 400 when recurring order ID does not exist', async () => {
    const res = await request(app)
      .put('/orders/recurring/nonexistent-id')
      .set('Authorization', VALID_API_KEY)
      .send({ note: 'test' });

    expect(res.status).toStrictEqual(400);
    expect(res.body).toMatchObject({ error: expect.any(String), message: expect.any(String) });
  });

  test('should return 403 when the recurring order belongs to another user', async () => {
    await createUserMap(OTHER_API_KEY, OTHER_USER_ID);
    const otherRecurringOrderId = await createRecurringOrder(OTHER_API_KEY);

    const res = await request(app)
      .put(`/orders/recurring/${otherRecurringOrderId}`)
      .set('Authorization', VALID_API_KEY)
      .send({ note: 'hijack' });

    expect(res.status).toStrictEqual(403);
    expect(res.body).toMatchObject({ error: expect.any(String), message: expect.any(String) });
  });

  // Successful edit tests
  test('should update note on template and all instances', async () => {
    const recurringOrderId = await createRecurringOrder(VALID_API_KEY);

    const res = await request(app)
      .put(`/orders/recurring/${recurringOrderId}`)
      .set('Authorization', VALID_API_KEY)
      .send({ note: 'Updated note' });

    expect(res.status).toStrictEqual(200);

    const updated = await RecurringOrderModel.findOne({ id: recurringOrderId });
    expect(updated).not.toBeNull();
    expect(updated!.order.note).toStrictEqual('Updated note');
    for (const inst of updated!.orderInstances) {
      expect(inst.order.note).toStrictEqual('Updated note');
    }
  });

  test('should update orderLines on template and all instances with recalculated totals', async () => {
    const recurringOrderId = await createRecurringOrder(VALID_API_KEY);

    const newOrderLines = [
      {
        lineItem: {
          id: 'line-2',
          quantity: 5,
          unitCode: 'EA',
          lineExtensionAmount: 50,
          price: { priceAmount: 10, currencyID: 'USD' },
          item: { name: 'New Chalk' },
        },
      },
    ];

    const res = await request(app)
      .put(`/orders/recurring/${recurringOrderId}`)
      .set('Authorization', VALID_API_KEY)
      .send({ orderLines: newOrderLines });

    expect(res.status).toStrictEqual(200);

    const updated = await RecurringOrderModel.findOne({ id: recurringOrderId });
    expect(updated).not.toBeNull();
    expect(updated!.order.orderLines[0].lineItem.item.name).toStrictEqual('New Chalk');
    expect(updated!.order.anticipatedMonetaryTotal!.payableAmount).toStrictEqual(50);

    for (const inst of updated!.orderInstances) {
      expect(inst.order.orderLines[0].lineItem.item.name).toStrictEqual('New Chalk');
      expect(inst.order.anticipatedMonetaryTotal!.payableAmount).toStrictEqual(50);
    }
  });

  test('should update delivery on template and all instances', async () => {
    const recurringOrderId = await createRecurringOrder(VALID_API_KEY);

    const newDelivery = {
      deliveryAddress: {
        streetName: '99 Delivery Rd',
        cityName: 'Brisbane',
        postalZone: '4000',
        country: 'AU',
      },
    };

    const res = await request(app)
      .put(`/orders/recurring/${recurringOrderId}`)
      .set('Authorization', VALID_API_KEY)
      .send({ delivery: newDelivery });

    expect(res.status).toStrictEqual(200);

    const updated = await RecurringOrderModel.findOne({ id: recurringOrderId });
    expect(updated).not.toBeNull();
    expect(updated!.order.delivery!.deliveryAddress!.streetName).toStrictEqual('99 Delivery Rd');
    for (const inst of updated!.orderInstances) {
      expect(inst.order.delivery!.deliveryAddress!.streetName).toStrictEqual('99 Delivery Rd');
    }
  });

  // Validation test
  test('should return 400 when updated order fails validation', async () => {
    const recurringOrderId = await createRecurringOrder(VALID_API_KEY);

    const res = await request(app)
      .put(`/orders/recurring/${recurringOrderId}`)
      .set('Authorization', VALID_API_KEY)
      .send({ orderLines: [] });

    expect(res.status).toStrictEqual(400);
    expect(res.body.errors).toBeDefined();
  });

  // Propagation test
  test('should propagate updates to all instances, not just the first', async () => {
    const recurringOrderId = await createRecurringOrder(VALID_API_KEY);

    const before = await RecurringOrderModel.findOne({ id: recurringOrderId });
    expect(before!.orderInstances.length).toBeGreaterThan(1);

    const res = await request(app)
      .put(`/orders/recurring/${recurringOrderId}`)
      .set('Authorization', VALID_API_KEY)
      .send({ note: 'Propagated note' });

    expect(res.status).toStrictEqual(200);

    const updated = await RecurringOrderModel.findOne({ id: recurringOrderId });
    expect(updated!.orderInstances.length).toStrictEqual(before!.orderInstances.length);
    for (let i = 0; i < updated!.orderInstances.length; i++) {
      expect(updated!.orderInstances[i].order.note).toStrictEqual('Propagated note');
    }
  });
});
