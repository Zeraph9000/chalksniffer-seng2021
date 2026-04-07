import request from 'supertest';
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import app from '../src/app';
import { advanceDate, generateScheduledDates, generateOrderInstances } from '../src/orders/recurringOrderService';
import { Frequency } from '../src/types';
import { buildValidOrderPayload, clearOrderTestData, seedDefaultUserMap, seedInvalidRecurringOrder, VALID_API_KEY } from './helpers/orderTestHelpers';
import './setup';

beforeEach(async () => {
  await clearOrderTestData();
  await seedDefaultUserMap();
});

describe('advanceDate', () => {
  test('advances by 1 day for Daily frequency', () => {
    const date = new Date('2024-01-15');
    advanceDate(date, 'Daily' as Frequency);
    expect(date.toISOString().startsWith('2024-01-16')).toStrictEqual(true);
  });

  test('advances by 7 days for Weekly frequency', () => {
    const date = new Date('2024-01-15');
    advanceDate(date, 'Weekly' as Frequency);
    expect(date.toISOString().startsWith('2024-01-22')).toStrictEqual(true);
  });

  test('advances by 1 month for Monthly frequency', () => {
    const date = new Date('2024-01-15');
    advanceDate(date, 'Monthly' as Frequency);
    expect(date.toISOString().startsWith('2024-02-15')).toStrictEqual(true);
  });
});

describe('generateScheduledDates', () => {
  test('returns the correct number of dates', () => {
    const dates = generateScheduledDates('2024-01-15T00:00:00.000Z', 'Weekly' as Frequency, 5);
    expect(dates).toHaveLength(5);
  });

  test('first date matches the start date', () => {
    const startDate = '2024-01-15T00:00:00.000Z';
    const dates = generateScheduledDates(startDate, 'Daily' as Frequency, 3);
    expect(dates[0]).toStrictEqual(startDate);
  });

  test('daily dates are spaced 1 day apart', () => {
    const dates = generateScheduledDates('2024-01-15T00:00:00.000Z', 'Daily' as Frequency, 3);
    expect(dates[1]!.startsWith('2024-01-16')).toStrictEqual(true);
    expect(dates[2]!.startsWith('2024-01-17')).toStrictEqual(true);
  });

  test('weekly dates are spaced 7 days apart', () => {
    const dates = generateScheduledDates('2024-01-15T00:00:00.000Z', 'Weekly' as Frequency, 3);
    expect(dates[1]!.startsWith('2024-01-22')).toStrictEqual(true);
    expect(dates[2]!.startsWith('2024-01-29')).toStrictEqual(true);
  });

  test('monthly dates are spaced 1 month apart', () => {
    const dates = generateScheduledDates('2024-01-15T00:00:00.000Z', 'Monthly' as Frequency, 3);
    expect(dates[1]!.startsWith('2024-02-15')).toStrictEqual(true);
    expect(dates[2]!.startsWith('2024-03-15')).toStrictEqual(true);
  });
});

describe('generateOrderInstances', () => {
  const templateOrder = buildValidOrderPayload() as any;

  test('returns 5 instances', () => {
    const instances = generateOrderInstances(templateOrder, '2024-01-15T00:00:00.000Z', 'Weekly' as Frequency);
    expect(instances).toHaveLength(5);
  });

  test('each instance has a unique id', () => {
    const instances = generateOrderInstances(templateOrder, '2024-01-15T00:00:00.000Z', 'Weekly' as Frequency);
    const ids = instances.map(i => i.order.id);
    expect(new Set(ids).size).toStrictEqual(5);
  });

  test('scheduled dates are spaced correctly for Weekly frequency', () => {
    const instances = generateOrderInstances(templateOrder, '2024-01-15T00:00:00.000Z', 'Weekly' as Frequency);
    expect(instances[0]!.scheduledDate.startsWith('2024-01-15')).toStrictEqual(true);
    expect(instances[1]!.scheduledDate.startsWith('2024-01-22')).toStrictEqual(true);
  });

  test('issue date of each instance matches its scheduled date', () => {
    const instances = generateOrderInstances(templateOrder, '2024-01-15T00:00:00.000Z', 'Daily' as Frequency);
    instances.forEach(i => {
      expect(i.order.issueDate).toStrictEqual(i.scheduledDate.split('T')[0]);
    });
  });
});

describe('POST /orders (recurring creation)', () => {
  test('returns 400 when frequency is invalid', async () => {
    const res = await request(app)
      .post('/orders')
      .set('Authorization', VALID_API_KEY)
      .send({ ...buildValidOrderPayload(), recurring: true, frequency: 'Yearly', startDate: '2026-03-15' });

    expect(res.status).toStrictEqual(400);
    expect(res.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'frequency' }),
    ]));
  });

  test('returns 400 when startDate is missing', async () => {
    const res = await request(app)
      .post('/orders')
      .set('Authorization', VALID_API_KEY)
      .send({ ...buildValidOrderPayload(), recurring: true, frequency: 'Weekly' });

    expect(res.status).toStrictEqual(400);
    expect(res.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'startDate' }),
    ]));
  });

  test('returns 400 when startDate is not a valid date string', async () => {
    const res = await request(app)
      .post('/orders')
      .set('Authorization', VALID_API_KEY)
      .send({ ...buildValidOrderPayload(), recurring: true, frequency: 'Weekly', startDate: 'not-a-date' });

    expect(res.status).toStrictEqual(400);
    expect(res.body.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ field: 'startDate' }),
    ]));
  });
});

describe('POST /orders/recurring', () => {
  describe('successful processing [status:200]', () => {
    test('returns 200 with zero processed when no recurring orders exist [status:200]', async () => {
      const res = await request(app)
        .post('/orders/recurring')
        .set('Authorization', VALID_API_KEY);
      expect(res.status).toStrictEqual(200);
      expect(res.body).toStrictEqual({ processed: 0, orderIds: [] });
    });

    test('returns 200 with processed count and order IDs after processing due recurring orders [status:200]', async () => {
      await request(app)
        .post('/orders')
        .set('Authorization', VALID_API_KEY)
        .send({ ...buildValidOrderPayload(), recurring: true, frequency: 'Daily', startDate: '2024-01-01' });

      const res = await request(app)
        .post('/orders/recurring')
        .set('Authorization', VALID_API_KEY);
      expect(res.status).toStrictEqual(200);
      expect(res.body.processed).toStrictEqual(1);
      expect(res.body.orderIds).toHaveLength(1);
      expect(typeof res.body.orderIds[0]).toBe('string');
    });
  });

  describe('invalid order data [status:400]', () => {
    test('using invalid order data for a recurring order instance [status:400]', async () => {
      await seedInvalidRecurringOrder();

      const res = await request(app)
        .post('/orders/recurring')
        .set('Authorization', VALID_API_KEY);
      expect(res.status).toStrictEqual(400);
      expect(res.body).toStrictEqual({
        error: expect.any(String),
        message: expect.any(String),
      });
    });
  });
});
