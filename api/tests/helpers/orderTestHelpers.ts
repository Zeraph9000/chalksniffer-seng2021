import crypto from 'crypto';
import { expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app';
import OrderModel from '../../src/models/order';
import OrderXml from '../../src/models/orderXml';
import RecurringOrderModel from '../../src/models/recurringOrder';
import { UserMap } from '../../src/models/userMap';
import type { Order } from '../../src/types';

export const VALID_API_KEY = 'test-api-key';
export const VALID_USER_ID = 'test-user';
export const OTHER_API_KEY = 'other-api-key';
export const OTHER_USER_ID = 'other-user';

type CreateOrderPayload = Omit<
  Order,
  'id' | 'userId' | 'anticipatedMonetaryTotal' | 'createdAt' | 'updatedAt' | 'xmlUrl'
>;

export function buildValidOrderPayload(
  overrides: Partial<CreateOrderPayload> = {}
): CreateOrderPayload {
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
    ...overrides,
  };
}

export async function clearOrderTestData(): Promise<void> {
  await Promise.all([
    OrderModel.deleteMany({}),
    OrderXml.deleteMany({}),
    UserMap.deleteMany({}),
    RecurringOrderModel.deleteMany({}),
  ]);
}

export async function seedInvalidRecurringOrder(): Promise<void> {
  await RecurringOrderModel.create({
    id: crypto.randomUUID(),
    userId: VALID_USER_ID,
    order: {
      id: crypto.randomUUID(),
      userId: VALID_USER_ID,
      issueDate: '2024-01-01',
      documentCurrencyCode: 'INVALID',
      buyerCustomerParty: { party: { partyName: 'Buyer', postalAddress: { streetName: '1 St', cityName: 'Sydney', postalZone: '2000', country: 'AU' } } },
      sellerSupplierParty: { party: { partyName: 'Seller', postalAddress: { streetName: '2 St', cityName: 'Melbourne', postalZone: '3000', country: 'AU' } } },
      orderLines: [{ lineItem: { id: 'line-1', quantity: 1, price: { priceAmount: 10, currencyID: 'INVALID' }, item: { name: 'Bad Item' } } }],
    },
    frequency: 'Daily',
    startDate: '2024-01-01',
    orderInstances: [
      {
        scheduledDate: '2024-01-01T00:00:00.000Z',
        order: {
          id: crypto.randomUUID(),
          userId: VALID_USER_ID,
          issueDate: '2024-01-01',
          documentCurrencyCode: 'INVALID',
          buyerCustomerParty: { party: { partyName: 'Buyer', postalAddress: { streetName: '1 St', cityName: 'Sydney', postalZone: '2000', country: 'AU' } } },
          sellerSupplierParty: { party: { partyName: 'Seller', postalAddress: { streetName: '2 St', cityName: 'Melbourne', postalZone: '3000', country: 'AU' } } },
          orderLines: [{ lineItem: { id: 'line-1', quantity: 1, price: { priceAmount: 10, currencyID: 'INVALID' }, item: { name: 'Bad Item' } } }],
        },
      },
    ],
  });
}

export async function createUserMap(apiKey: string, userId: string): Promise<void> {
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
  await UserMap.create({ userId, apiKey: hashedKey });
}

export async function seedDefaultUserMap(): Promise<void> {
  await createUserMap(VALID_API_KEY, VALID_USER_ID);
}

export async function createOrder(
  apiKey: string,
  overrides: Partial<CreateOrderPayload> = {}
): Promise<string> {
  const res = await request(app)
    .post('/orders')
    .set('Authorization', apiKey)
    .send(buildValidOrderPayload(overrides));

  expect(res.status).toStrictEqual(200);
  return res.body.id as string;
}
