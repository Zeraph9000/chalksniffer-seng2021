import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import request from 'supertest';
import { parse } from 'csv-parse/sync';
import { OrderPaginated } from '../src/types';
import app from '../src/app';
import {
  clearOrderTestData,
  createOrder,
  createUserMap,
  OTHER_API_KEY,
  OTHER_USER_ID,
  seedDefaultUserMap,
  VALID_API_KEY,
} from './helpers/orderTestHelpers';

describe('/orders/csv (GET)', () => {
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
        .get('/orders/csv')
        .query({ limit: 3, offset: 0 });

      expect(res.status).toStrictEqual(401);
    });

    test('responds 400 when invalid limit', async () => {
      const orderId = await createOrder(VALID_API_KEY);
      await createOrder(VALID_API_KEY);

      const res = await request(app)
        .get('/orders/csv')
        .set('Authorization', VALID_API_KEY)
        .query({ limit: 0, offset: 0 });

      expect(res.status).toStrictEqual(400);
    });

    test('responds 400 when invalid offset', async () => {
      const orderId = await createOrder(VALID_API_KEY);
      await createOrder(VALID_API_KEY);

      const res = await request(app)
        .get('/orders/csv')
        .set('Authorization', VALID_API_KEY)
        .query({ limit: 1, offset: -1 });

      expect(res.status).toStrictEqual(400);
    });
  });

  test('responds 200 and returns a csv of the filtered orders', async () => {
    const orderId = await createOrder(VALID_API_KEY);
    await createOrder(VALID_API_KEY);

    const res = await request(app)
      .get('/orders/csv')
      .set('Authorization', VALID_API_KEY)
      .query({ limit: 1, offset: 0 });

    expect(res.status).toStrictEqual(200);
    const records: OrderPaginated[] = parse(res.text, { columns: true });
    expect(records[0].id).toStrictEqual(orderId);
    expect(records[0].buyerName).toStrictEqual('Buyer Pty Ltd');
    expect(records[0].sellerName).toStrictEqual('Seller Pty Ltd');
    expect(records[0].payableAmount).toStrictEqual('20');
    expect(records[0].documentCurrencyCode).toStrictEqual('USD');
  });

  test('responds 200 and returns a csv excluding other users', async () => {
    const orderId = await createOrder(VALID_API_KEY);

    await createUserMap(OTHER_API_KEY, OTHER_USER_ID);
    await createOrder(OTHER_API_KEY);

    const res = await request(app)
      .get('/orders/csv')
      .set('Authorization', VALID_API_KEY)
      .query({ limit: 10, offset: 0, id: orderId });

    expect(res.status).toStrictEqual(200);
    const records: OrderPaginated[] = parse(res.text, { columns: true });
    expect(records[0].id).toStrictEqual(orderId);
    expect(records[0].buyerName).toStrictEqual('Buyer Pty Ltd');
    expect(records[0].sellerName).toStrictEqual('Seller Pty Ltd');
    expect(records[0].payableAmount).toStrictEqual('20');
    expect(records[0].documentCurrencyCode).toStrictEqual('USD');
  });
});