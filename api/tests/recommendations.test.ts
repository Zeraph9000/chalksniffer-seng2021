import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import {
  clearOrderTestData,
  createOrder,
  seedDefaultUserMap,
  VALID_API_KEY,
} from './helpers/orderTestHelpers';

describe('/order/recommend', () => {
  beforeEach(async () => {
    await clearOrderTestData();
    await seedDefaultUserMap();
  });

  afterEach(async () => {
    await clearOrderTestData();
  });

  test('should return 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/order/recommend');
    expect(res.status).toStrictEqual(401);
  });

  test('should return 401 when the Authorization header contains an invalid API key', async () => {
    const res = await request(app)
      .get('/order/recommend')
      .set('Authorization', 'invalid-key');
    expect(res.status).toStrictEqual(401);
  });

  test('should return 400 if user has no orders', async () => {
    const res = await request(app)
      .get('/order/recommend')
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toStrictEqual(400);
    expect(res.body.error).toStrictEqual('No frequent orders found');
  });

  test('should return 400 if no frequent orders found', async () => {
    const orderBody1 = {
      issueDate: '2023-01-01',
      documentCurrencyCode: 'USD',
      buyerCustomerParty: {
        party: {
          partyName: 'Buyer',
          postalAddress: { streetName: 'Street', cityName: 'City', postalZone: '12345', country: 'US' },
          contact: null
        }
      },
      sellerSupplierParty: {
        party: {
          partyName: 'Seller',
          postalAddress: { streetName: 'Street', cityName: 'City', postalZone: '12345', country: 'US' },
          contact: null
        }
      },
      orderLines: [{
        lineItem: {
          item: { name: 'ItemA' },
          quantity: 2,
          id: 'line1',
          price: { priceAmount: 10, currencyID: 'USD' }
        }
      }]
    };
    const orderBody2 = {
      ...orderBody1,
      orderLines: [{
        lineItem: {
          item: { name: 'ItemB' },
          quantity: 1,
          id: 'line2',
          price: { priceAmount: 5, currencyID: 'USD' }
        }
      }]
    };

    await createOrder(VALID_API_KEY, orderBody1);
    await createOrder(VALID_API_KEY, orderBody2);

    const res = await request(app)
      .get('/order/recommend')
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toStrictEqual(400);
    expect(res.body.error).toStrictEqual('No frequent orders found');
  });

  test('should return 200 and the most frequent order when user has multiple similar orders', async () => {
    const orderBody = {
      issueDate: '2023-01-01',
      documentCurrencyCode: 'USD',
      buyerCustomerParty: {
        party: {
          partyName: 'Buyer',
          postalAddress: { streetName: 'Street', cityName: 'City', postalZone: '12345', country: 'US' },
          contact: null
        }
      },
      sellerSupplierParty: {
        party: {
          partyName: 'Seller',
          postalAddress: { streetName: 'Street', cityName: 'City', postalZone: '12345', country: 'US' },
          contact: null
        }
      },
      orderLines: [{
        lineItem: {
          item: { name: 'ItemA' },
          quantity: 2,
          id: 'line1',
          price: { priceAmount: 10, currencyID: 'USD' }
        }
      }]
    };
    const orderBodyDiff = {
      ...orderBody,
      orderLines: [{
        lineItem: {
          item: { name: 'ItemB' },
          quantity: 1,
          id: 'line2',
          price: { priceAmount: 5, currencyID: 'USD' }
        }
      }]
    };

    const order1 = await createOrder(VALID_API_KEY, orderBody);
    await createOrder(VALID_API_KEY, orderBody); // Same as order1
    await createOrder(VALID_API_KEY, orderBodyDiff);

    const res = await request(app)
      .get('/order/recommend')
      .set('Authorization', VALID_API_KEY);

    expect(res.status).toStrictEqual(200);
    expect(res.body.id).toStrictEqual(order1);
  });
});