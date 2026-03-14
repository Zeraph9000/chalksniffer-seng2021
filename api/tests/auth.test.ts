import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import './setup';

beforeEach(async () => {
  await mongoose.connection.dropDatabase();
});

describe('POST /auth/register', () => {
  describe('successful registration [status:200]', () => {
    test('returns 200 with an apiKey [status:200]', async () => {
      const res = await request(app).post('/auth/register');

      expect(res.status).toStrictEqual(200);
      expect(res.body).toStrictEqual({ apiKey: expect.any(String) });
    });

    test('each registration returns a unique apiKey [status:200]', async () => {
      const res1 = await request(app).post('/auth/register');
      const res2 = await request(app).post('/auth/register');

      expect(res1.status).toStrictEqual(200);
      expect(res2.status).toStrictEqual(200);
      expect(res1.body.apiKey).not.toStrictEqual(res2.body.apiKey);
    });

    test('returned apiKey grants access to protected routes [status:200]', async () => {
      const registerRes = await request(app).post('/auth/register');
      const apiKey = registerRes.body.apiKey;

      const refreshRes = await request(app)
        .post('/auth/token/refresh')
        .set('Authorization', apiKey);

      expect(refreshRes.status).toStrictEqual(200);
    });
  });
});

describe('POST /auth/token/refresh', () => {
  describe('authentication [status:401]', () => {
    test('returns 401 when no Authorization header is provided [status:401]', async () => {
      const res = await request(app).post('/auth/token/refresh');

      expect(res.status).toStrictEqual(401);
      expect(res.body).toStrictEqual({ error: expect.any(String) });
    });

    test('returns 401 when an invalid API key is provided [status:401]', async () => {
      const res = await request(app)
        .post('/auth/token/refresh')
        .set('Authorization', 'not-a-real-key');

      expect(res.status).toStrictEqual(401);
      expect(res.body).toStrictEqual({ error: expect.any(String) });
    });
  });

  describe('successful refresh [status:200]', () => {
    let apiKey: string;
    beforeEach(async () => {
      const res = await request(app).post('/auth/register');
      apiKey = res.body.apiKey;
    });

    test('returns 200 with a new apiKey [status:200]', async () => {
      const res = await request(app)
        .post('/auth/token/refresh')
        .set('Authorization', apiKey);

      expect(res.status).toStrictEqual(200);
      expect(res.body).toStrictEqual({ apiKey: expect.any(String) });
    });

    test('returned apiKey is different from the old one [status:200]', async () => {
      const res = await request(app)
        .post('/auth/token/refresh')
        .set('Authorization', apiKey);

      expect(res.status).toStrictEqual(200);
      expect(res.body.apiKey).not.toStrictEqual(apiKey);
    });

    test('old apiKey is invalidated after refresh [status:401]', async () => {
      await request(app)
        .post('/auth/token/refresh')
        .set('Authorization', apiKey);

      const res = await request(app)
        .post('/auth/token/refresh')
        .set('Authorization', apiKey);

      expect(res.status).toStrictEqual(401);
    });

    test('new apiKey is usable after refresh [status:200]', async () => {
      const refreshRes = await request(app)
        .post('/auth/token/refresh')
        .set('Authorization', apiKey);

      const newApiKey = refreshRes.body.apiKey;

      const res = await request(app)
        .post('/auth/token/refresh')
        .set('Authorization', newApiKey);

      expect(res.status).toStrictEqual(200);
    });
  });
});
