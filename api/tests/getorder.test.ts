import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import request from 'supertest';
import { Order, OrderResponse } from '../src/types';
import app from '../src/app';
import {
  clearOrderTestData,
  createOrder,
  createGetOrder,
  createUserMap,
  OTHER_API_KEY,
  OTHER_USER_ID,
  seedDefaultUserMap,
  VALID_API_KEY,
} from './helpers/orderTestHelpers';

describe('/orders/:id (GET)', () => {
  beforeEach(async () => {
    await clearOrderTestData();
    await seedDefaultUserMap();
  });

  afterEach(async () => {
    await clearOrderTestData();
  });

  describe('Error codes testing', () => {
    test('responds 401 when no Authorization header is provided', async () => {
      const res = await request(app)
        .get('/orders/5');

      expect(res.status).toStrictEqual(401);
    });

    test('responds 400 when an invalid orderId was provided', async () => {
      const orderId = await createOrder(VALID_API_KEY);
      await createOrder(VALID_API_KEY);

      const res = await request(app)
        .get(`/orders/${orderId + 'invalid'}`)
        .set('Authorization', VALID_API_KEY);

      expect(res.status).toStrictEqual(400);
    });
  });

  test('responds 200 and returns an order given its Id', async () => {
    const order = await createGetOrder(VALID_API_KEY);

    await createUserMap(OTHER_API_KEY, OTHER_USER_ID);
    await createOrder(OTHER_API_KEY);

    const res = await request(app)
      .get(`/orders/${order.id}`)
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toStrictEqual(200);
    const details: OrderResponse = {
      id: res.body.id,
      issueDate: res.body.issueDate,
      documentCurrencyCode: res.body.documentCurrencyCode,
      buyerCustomerParty: res.body.buyerCustomerParty,
      sellerSupplierParty: res.body.sellerSupplierParty,
      orderLines: res.body.orderLines,
      anticipatedMonetaryTotal: res.body.anticipatedMonetaryTotal!,
      createdAt: res.body.createdAt,
      xmlUrl: res.body.xmlUrl,
    };

    expect(details).toStrictEqual({
      id: order.id,
      issueDate: order.issueDate,
      documentCurrencyCode: order.documentCurrencyCode,
      buyerCustomerParty: order.buyerCustomerParty,
      sellerSupplierParty: order.sellerSupplierParty,
      orderLines: order.orderLines,
      anticipatedMonetaryTotal: order.anticipatedMonetaryTotal!,
      createdAt: order.createdAt,
      xmlUrl: order.xmlUrl,
    });
  });
});
