import request from 'supertest';
import app from '../src/app';
import { UserMap } from '../src/models/userMap';
import { createUserMap, createOrder } from '../tests/testHelpers';
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import OrderModel from '../src/models/order';
import OrderXml from '../src/models/orderXml';

const VALID_API_KEY = 'test-api-key';
const VALID_USER_ID = 'test-user';
const OTHER_API_KEY = 'other-api-key';
const OTHER_USER_ID = 'other-user';

describe('/orders (GET)', () => {
  beforeEach(async () => {
    await OrderModel.deleteMany({});
    await OrderXml.deleteMany({});
    await UserMap.deleteMany({});

    await createUserMap(VALID_API_KEY, VALID_USER_ID);
  });

  // test('responds 401 when no Authorization header is provided', async () => {
  //   const res = await request(app).get('/orders')
  //     .query({ })
  //     .send({ limit: 3, offset: 1 });
  //   expect(res.status).toBe(401);
  // });

  // test('responds 200 given correct ', async () => {
  //   const res = await request(app).get('/orders').send({ limit: 3, offset: 1 });
  //   expect(res.status).toBe(401);
  // });
});