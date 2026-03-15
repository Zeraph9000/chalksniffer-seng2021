import crypto from 'crypto';
import request from 'supertest';
import app from '../src/app';
import { UserMap } from '../src/models/userMap';
import type { Order,  } from '../src/types';
import { expect } from '@jest/globals';

const VALID_API_KEY = 'test-api-key';

type OrderPayload = Omit<
  Order,
  'id' | 'userId' | 'anticipatedMonetaryTotal' | 'createdAt' | 'updatedAt' | 'xmlUrl'
>;

export function buildValidOrderPayload(): OrderPayload {
  return {
    issueDate: '2026-03-15',
    documentCurrencyCode: 'USD',
    buyerCustomerParty: {
      party: {
        partyName: 'Buyer Pty Ltd',
        postalAddress: {
          streetName: '1 Buyer St',
          cityName: 'Sydney',
          postalZone: '2000',
          country: 'AU',
        },
      },
    },
    sellerSupplierParty: {
      party: {
        partyName: 'Seller Pty Ltd',
        postalAddress: {
          streetName: '2 Seller St',
          cityName: 'Melbourne',
          postalZone: '3000',
          country: 'AU',
        },
      },
    },
    orderLines: [
      {
        lineItem: {
          id: 'line-1',
          quantity: 2,
          unitCode: 'EA',
          lineExtensionAmount: 20,
          price: {
            priceAmount: 10,
            currencyID: 'USD',
          },
          item: {
            name: 'Chalk',
          },
        },
      },
    ],
  };
}

export async function createUserMap(apiKey: string, userId: string): Promise<void> {
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
  await UserMap.create({ userId, apiKey: hashedKey });
}

export async function createOrder(apiKey = VALID_API_KEY, orderPayload: OrderPayload) {
  const res = await request(app)
    .post('/orders')
    .set('Authorization', apiKey)
    .send(orderPayload);

  expect(res.status).toBe(200);
  return res.body.id as string;
}