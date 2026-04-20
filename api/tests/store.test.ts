import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import request from 'supertest';
import app from '../src/app';
import StoreModel from '../src/models/store';
import type { store } from '../src/types';
import {
  clearOrderTestData,
  createUserMap,
  OTHER_API_KEY,
  OTHER_USER_ID,
  seedDefaultUserMap,
  VALID_API_KEY,
  VALID_USER_ID,
} from './helpers/orderTestHelpers';

function buildValidStorePayload(overrides: Partial<store> = {}): Partial<store> {
  return {
    storeName: 'Northside Chalk',
    description: 'Bulk chalk and classroom supplies',
    status: 'active',
    logoUrl: 'https://example.com/logo.png',
    bannerUrl: 'https://example.com/banner.png',
    location: 'Sydney',
    category: 'Education',
    ...overrides,
  };
}

async function createStore(apiKey: string, overrides: Partial<store> = {}): Promise<store> {
  const res = await request(app)
    .post('/stores')
    .set('Authorization', apiKey)
    .send(buildValidStorePayload(overrides));

  expect(res.status).toStrictEqual(201);
  return res.body as store;
}

describe('store endpoints', () => {
  beforeEach(async () => {
    await clearOrderTestData();
    await seedDefaultUserMap();
  });

  afterEach(async () => {
    await clearOrderTestData();
  });

  describe('POST /stores', () => {
    test('returns 401 when no Authorization header is provided', async () => {
      const res = await request(app)
        .post('/stores')
        .send(buildValidStorePayload());

      expect(res.status).toStrictEqual(401);
      expect(res.body).toStrictEqual({ error: expect.any(String), message: expect.any(String) });
    });

    test('returns 400 for an invalid request body', async () => {
      const res = await request(app)
        .post('/stores')
        .set('Authorization', VALID_API_KEY)
        .send({ storeName: 'Incomplete Store' });

      expect(res.status).toStrictEqual(400);
      expect(res.body).toStrictEqual({
        error: 'INVALID_STORE_BODY',
        message: expect.any(String),
      });
    });

    test('returns 201 and the created store for a valid request', async () => {
      const res = await request(app)
        .post('/stores')
        .set('Authorization', VALID_API_KEY)
        .send(buildValidStorePayload());

      expect(res.status).toStrictEqual(201);
      expect(res.body).toMatchObject({
        userId: VALID_USER_ID,
        storeName: 'Northside Chalk',
        description: 'Bulk chalk and classroom supplies',
        status: 'active',
      });
      expect(res.body.storeId).toEqual(expect.any(String));
    });

    test('returns 409 when the authenticated user already owns a store', async () => {
      await createStore(VALID_API_KEY);

      const res = await request(app)
        .post('/stores')
        .set('Authorization', VALID_API_KEY)
        .send(buildValidStorePayload({ storeName: 'Second Store' }));

      expect(res.status).toStrictEqual(409);
      expect(res.body).toStrictEqual({
        error: 'CONFLICT',
        message: expect.any(String),
      });
    });
  });

  describe('GET /stores', () => {
    test('returns only stores whose status is not closed', async () => {
      await createStore(VALID_API_KEY, { status: 'active' });
      await createUserMap(OTHER_API_KEY, OTHER_USER_ID);
      await StoreModel.create({
        storeId: 'closed-store',
        userId: OTHER_USER_ID,
        storeName: 'Archived Chalk',
        description: 'Closed storefront',
        status: 'closed',
      });

      const res = await request(app)
        .get('/stores')
        .set('Authorization', VALID_API_KEY);

      expect(res.status).toStrictEqual(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].status).toStrictEqual('active');
      expect(res.body.find((s: store) => s.storeId === 'closed-store')).toBeUndefined();
    });
  });

  describe('GET /stores/me', () => {
    test('returns the authenticated user store', async () => {
      const createdStore = await createStore(VALID_API_KEY);

      const res = await request(app)
        .get('/stores/me')
        .set('Authorization', VALID_API_KEY);

      expect(res.status).toStrictEqual(200);
      expect(res.body.storeId).toStrictEqual(createdStore.storeId);
    });
  });

  describe('GET /stores/:storeId', () => {
    test('returns the requested store', async () => {
      const createdStore = await createStore(VALID_API_KEY);

      const res = await request(app)
        .get(`/stores/${createdStore.storeId}`)
        .set('Authorization', VALID_API_KEY);

      expect(res.status).toStrictEqual(200);
      expect(res.body.storeId).toStrictEqual(createdStore.storeId);
    });
  });

  describe('PUT /stores/:storeId', () => {
    test('updates a store and persists the changes', async () => {
      const createdStore = await createStore(VALID_API_KEY);

      const res = await request(app)
        .put(`/stores/${createdStore.storeId}`)
        .set('Authorization', VALID_API_KEY)
        .send({ description: 'Updated store description' });

      expect(res.status).toStrictEqual(200);
      expect(res.body.description).toStrictEqual('Updated store description');

      const persistedStore = await StoreModel.findOne({ storeId: createdStore.storeId });
      expect(persistedStore?.description).toStrictEqual('Updated store description');
    });
  });

  describe('PUT /stores/:storeId/status', () => {
    test('updates the store status and hides closed stores from the listing endpoint', async () => {
      const createdStore = await createStore(VALID_API_KEY);

      const updateRes = await request(app)
        .put(`/stores/${createdStore.storeId}/status`)
        .set('Authorization', VALID_API_KEY)
        .send({ status: 'closed' });

      expect(updateRes.status).toStrictEqual(200);
      expect(updateRes.body.status).toStrictEqual('closed');

      const listRes = await request(app)
        .get('/stores')
        .set('Authorization', VALID_API_KEY);

      expect(listRes.status).toStrictEqual(200);
      expect(listRes.body).toHaveLength(0);
    });
  });
});
