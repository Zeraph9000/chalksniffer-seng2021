import request from 'supertest';
import app from '../src/app';
import { createUser } from '../src/auth/auth';
import { cronJobs } from '../src/utils/recurringOrderService';
import OrderModel from '../src/models/order';
import OrderXml from '../src/models/orderXml';
import RecurringOrderModel from '../src/models/recurringOrder';
import mongoose from 'mongoose';

jest.setTimeout(30000);

let apiKey: string;

const VALID_ADDRESS = {
  streetName: '123 Main St',
  cityName: 'Sydney',
  postalZone: '2000',
  country: 'AU',
};

const VALID_PARTY = {
  partyName: 'Test Corp',
  postalAddress: VALID_ADDRESS,
};

const VALID_ORDER_LINE = {
  lineItem: {
    id: 'line-1',
    quantity: 10,
    price: { priceAmount: 25.0, currencyID: 'AUD' },
    item: { name: 'Widget' },
  },
};

const MINIMAL_VALID_ORDER = {
  issueDate: '2026-01-15',
  documentCurrencyCode: 'AUD',
  buyerCustomerParty: { party: VALID_PARTY },
  sellerSupplierParty: { party: { ...VALID_PARTY, partyName: 'Seller Corp' } },
  orderLines: [VALID_ORDER_LINE],
};

function makeOrder(overrides: Record<string, any> = {}) {
  return JSON.parse(JSON.stringify({ ...MINIMAL_VALID_ORDER, ...overrides }));
}

function post(body: any, key?: string) {
  const req = request(app).post('/orders').send(body);
  if (key !== undefined) req.set('Authorization', key);
  return req;
}

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key]!.deleteMany({});
  }
  // Stop any cron jobs from previous tests
  for (const [, task] of cronJobs) {
    task.stop();
  }
  cronJobs.clear();
  apiKey = await createUser();
});

afterAll(() => {
  for (const [, task] of cronJobs) {
    task.stop();
  }
  cronJobs.clear();
});

// ─── 1. Authentication ──────────────────────────────────────────────────────
describe('Authentication', () => {
  it('returns 401 when no Authorization header is set', async () => {
    const res = await post(makeOrder());
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('returns 401 for an invalid API key', async () => {
    const res = await post(makeOrder(), 'invalid-key-123');
    expect(res.status).toBe(401);
  });

  it('returns 401 when key is Bearer-prefixed (route hashes raw header)', async () => {
    const res = await post(makeOrder(), `Bearer ${apiKey}`);
    expect(res.status).toBe(401);
  });

  it('returns 200 with a raw valid API key', async () => {
    const res = await post(makeOrder(), apiKey);
    expect(res.status).toBe(200);
  });
});

// ─── 2. Happy path – standard orders ────────────────────────────────────────
describe('Happy path - standard orders', () => {
  it('minimal valid order returns 200 with correct response shape', async () => {
    const res = await post(makeOrder(), apiKey);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('issueDate');
    expect(res.body).toHaveProperty('anticipatedMonetaryTotal');
    expect(res.body).toHaveProperty('xmlUrl');
    expect(res.body).toHaveProperty('createdAt');
  });

  it('server ignores client-provided id', async () => {
    const res = await post(makeOrder({ id: 'my-custom-id' }), apiKey);
    expect(res.status).toBe(200);
    expect(res.body.id).not.toBe('my-custom-id');
  });

  it('calculates anticipatedMonetaryTotal correctly (basic)', async () => {
    const res = await post(makeOrder(), apiKey);
    expect(res.status).toBe(200);
    // 10 * 25 = 250
    expect(res.body.anticipatedMonetaryTotal.lineExtensionAmount).toBe(250);
    expect(res.body.anticipatedMonetaryTotal.taxExclusiveAmount).toBe(250);
    expect(res.body.anticipatedMonetaryTotal.payableAmount).toBe(250);
  });

  it('calculates anticipatedMonetaryTotal correctly with tax', async () => {
    const order = makeOrder({ taxTotal: { taxAmount: 25, currencyID: 'AUD' } });
    const res = await post(order, apiKey);
    expect(res.status).toBe(200);
    expect(res.body.anticipatedMonetaryTotal.taxExclusiveAmount).toBe(250);
    expect(res.body.anticipatedMonetaryTotal.taxInclusiveAmount).toBe(275);
    expect(res.body.anticipatedMonetaryTotal.payableAmount).toBe(275);
  });

  it('calculates anticipatedMonetaryTotal correctly with allowances and charges', async () => {
    const order = makeOrder({
      allowanceCharge: [
        { chargeIndicator: false, amount: 10, currencyID: 'AUD' },
        { chargeIndicator: true, amount: 5, currencyID: 'AUD' },
      ],
    });
    const res = await post(order, apiKey);
    expect(res.status).toBe(200);
    // 250 - 10 + 5 = 245
    expect(res.body.anticipatedMonetaryTotal.taxExclusiveAmount).toBe(245);
    expect(res.body.anticipatedMonetaryTotal.allowanceTotalAmount).toBe(10);
    expect(res.body.anticipatedMonetaryTotal.chargeTotalAmount).toBe(5);
  });

  it('fully populated order with all optional fields returns 200', async () => {
    const order = makeOrder({
      issueTime: '14:30:00',
      salesOrderId: 'SO-001',
      orderTypeCode: '220',
      note: 'Test note',
      pricingCurrencyCode: 'USD',
      taxCurrencyCode: 'AUD',
      customerReference: 'CR-001',
      accountingCostCode: 'ACC-001',
      validityPeriod: { startDate: '2026-01-01', endDate: '2026-12-31' },
      quotationDocumentReference: { id: 'Q-001' },
      orderDocumentReference: { id: 'O-001' },
      originatorDocumentReference: { id: 'OR-001' },
      additionalDocumentReference: [{ id: 'AD-001' }],
      originatorCustomerParty: { party: VALID_PARTY },
      delivery: { deliveryAddress: VALID_ADDRESS, requestedDeliveryPeriod: { startDate: '2026-02-01', endDate: '2026-02-28' } },
      deliveryTerms: { specialTerms: 'Handle with care' },
      paymentMeans: { paymentMeansCode: '30', paymentDueDate: '2026-03-01' },
      paymentTerms: { note: 'Net 30' },
      taxTotal: { taxAmount: 25, currencyID: 'AUD', taxSubtotal: [{ taxableAmount: 250, taxAmount: 25, taxCategory: { percent: 10, taxScheme: 'GST' } }] },
      allowanceCharge: [{ chargeIndicator: true, amount: 5, currencyID: 'AUD', allowanceChargeReason: 'Freight' }],
    });
    const res = await post(order, apiKey);
    expect(res.status).toBe(200);
  });

  it('order is persisted in MongoDB (OrderModel)', async () => {
    const res = await post(makeOrder(), apiKey);
    const saved = await OrderModel.findOne({ id: res.body.id });
    expect(saved).not.toBeNull();
    expect(saved!.id).toBe(res.body.id);
  });

  it('XML is persisted in MongoDB (OrderXml)', async () => {
    const res = await post(makeOrder(), apiKey);
    const xml = await OrderXml.findOne({ orderId: res.body.id });
    expect(xml).not.toBeNull();
    expect(xml!.xml).toBeTruthy();
  });

  it('multiple order lines produce correct total', async () => {
    const order = makeOrder({
      orderLines: [
        { lineItem: { id: '1', quantity: 2, price: { priceAmount: 10, currencyID: 'AUD' }, item: { name: 'A' } } },
        { lineItem: { id: '2', quantity: 3, price: { priceAmount: 20, currencyID: 'AUD' }, item: { name: 'B' } } },
      ],
    });
    const res = await post(order, apiKey);
    expect(res.status).toBe(200);
    // 2*10 + 3*20 = 80
    expect(res.body.anticipatedMonetaryTotal.lineExtensionAmount).toBe(80);
  });
});

// ─── 3. Required fields missing ─────────────────────────────────────────────
describe('Required fields missing', () => {
  it('missing issueDate → 400', async () => {
    const order = makeOrder();
    delete order.issueDate;
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'issueDate')).toBe(true);
  });

  it('missing documentCurrencyCode → 400', async () => {
    const order = makeOrder();
    delete order.documentCurrencyCode;
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'documentCurrencyCode')).toBe(true);
  });

  it('missing buyerCustomerParty → 400', async () => {
    const order = makeOrder();
    delete order.buyerCustomerParty;
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'buyerCustomerParty')).toBe(true);
  });

  it('missing buyerCustomerParty.party → 400', async () => {
    const order = makeOrder({ buyerCustomerParty: {} });
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'buyerCustomerParty.party')).toBe(true);
  });

  it('missing sellerSupplierParty → 400', async () => {
    const order = makeOrder();
    delete order.sellerSupplierParty;
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'sellerSupplierParty')).toBe(true);
  });

  it('missing sellerSupplierParty.party → 400', async () => {
    const order = makeOrder({ sellerSupplierParty: {} });
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'sellerSupplierParty.party')).toBe(true);
  });

  it('missing orderLines → 500 (calculateMonetaryTotal crashes before validation)', async () => {
    const order = makeOrder();
    delete order.orderLines;
    const res = await post(order, apiKey);
    // calculateMonetaryTotal is called before validateOrder and crashes on missing orderLines
    expect(res.status).toBe(500);
  });

  it('empty body → 500 (calculateMonetaryTotal crashes before validation)', async () => {
    const res = await post({}, apiKey);
    expect(res.status).toBe(500);
  });
});

// ─── 4. Format validation ──────────────────────────────────────────────────
describe('Format validation', () => {
  it('invalid issueDate format (not YYYY-MM-DD) → 400', async () => {
    const res = await post(makeOrder({ issueDate: '15/01/2026' }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'issueDate')).toBe(true);
  });

  it('invalid issueDate format (ISO datetime) → 400', async () => {
    const res = await post(makeOrder({ issueDate: '2026-01-15T00:00:00Z' }), apiKey);
    expect(res.status).toBe(400);
  });

  it('invalid issueTime → 400', async () => {
    const res = await post(makeOrder({ issueTime: '2:30 PM' }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'issueTime')).toBe(true);
  });

  it('valid issueTime → 200', async () => {
    const res = await post(makeOrder({ issueTime: '14:30:00' }), apiKey);
    expect(res.status).toBe(200);
  });

  it('invalid documentCurrencyCode → 400', async () => {
    const res = await post(makeOrder({ documentCurrencyCode: 'INVALID' }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'documentCurrencyCode')).toBe(true);
  });

  it('invalid pricingCurrencyCode → 400', async () => {
    const res = await post(makeOrder({ pricingCurrencyCode: 'ZZZ' }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'pricingCurrencyCode')).toBe(true);
  });

  it('invalid taxCurrencyCode → 400', async () => {
    const res = await post(makeOrder({ taxCurrencyCode: 'ZZZ' }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'taxCurrencyCode')).toBe(true);
  });

  it('valid currency codes → 200', async () => {
    const res = await post(makeOrder({ pricingCurrencyCode: 'USD', taxCurrencyCode: 'EUR' }), apiKey);
    expect(res.status).toBe(200);
  });
});

// ─── 5. Order lines edge cases ──────────────────────────────────────────────
describe('Order lines edge cases', () => {
  it('empty orderLines array → 400', async () => {
    const res = await post(makeOrder({ orderLines: [] }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'orderLines')).toBe(true);
  });

  it('missing lineItem → 500 (calculateMonetaryTotal crashes before validation)', async () => {
    const res = await post(makeOrder({ orderLines: [{}] }), apiKey);
    // calculateMonetaryTotal accesses lineItem.quantity before validation runs
    expect(res.status).toBe(500);
  });

  it('missing lineItem.id → 400', async () => {
    const order = makeOrder();
    delete order.orderLines[0].lineItem.id;
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'orderLines[0].lineItem.id')).toBe(true);
  });

  it('quantity = 0 → 400', async () => {
    const order = makeOrder();
    order.orderLines[0].lineItem.quantity = 0;
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'orderLines[0].lineItem.quantity')).toBe(true);
  });

  it('quantity < 0 → 400', async () => {
    const order = makeOrder();
    order.orderLines[0].lineItem.quantity = -5;
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
  });

  it('quantity missing → 400', async () => {
    const order = makeOrder();
    delete order.orderLines[0].lineItem.quantity;
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'orderLines[0].lineItem.quantity')).toBe(true);
  });

  it('missing price → 500 (calculateMonetaryTotal crashes before validation)', async () => {
    const order = makeOrder();
    delete order.orderLines[0].lineItem.price;
    const res = await post(order, apiKey);
    // calculateMonetaryTotal accesses price.priceAmount before validation runs
    expect(res.status).toBe(500);
  });

  it('missing priceAmount → 400', async () => {
    const order = makeOrder();
    delete order.orderLines[0].lineItem.price.priceAmount;
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'orderLines[0].lineItem.price.priceAmount')).toBe(true);
  });

  it('missing price currencyID → 400', async () => {
    const order = makeOrder();
    delete order.orderLines[0].lineItem.price.currencyID;
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'orderLines[0].lineItem.price.currencyID')).toBe(true);
  });

  it('invalid price currencyID → 400', async () => {
    const order = makeOrder();
    order.orderLines[0].lineItem.price.currencyID = 'FAKE';
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'orderLines[0].lineItem.price.currencyID')).toBe(true);
  });

  it('missing item → 400', async () => {
    const order = makeOrder();
    delete order.orderLines[0].lineItem.item;
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'orderLines[0].lineItem.item')).toBe(true);
  });

  it('missing item.name → 400', async () => {
    const order = makeOrder();
    delete order.orderLines[0].lineItem.item.name;
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'orderLines[0].lineItem.item.name')).toBe(true);
  });

  it('multiple lines with errors produce indexed error fields', async () => {
    const order = makeOrder({
      orderLines: [
        { lineItem: { id: '1', quantity: -1, price: { priceAmount: 10, currencyID: 'AUD' }, item: { name: 'A' } } },
        { lineItem: { id: '2', quantity: 5, price: { priceAmount: 10, currencyID: 'FAKE' }, item: { name: 'B' } } },
      ],
    });
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field.startsWith('orderLines[0]'))).toBe(true);
    expect(res.body.errors.some((e: any) => e.field.startsWith('orderLines[1]'))).toBe(true);
  });
});

// ─── 6. Nested party/address validation ─────────────────────────────────────
describe('Nested party/address validation', () => {
  it('buyer missing partyName → 400', async () => {
    const order = makeOrder();
    delete order.buyerCustomerParty.party.partyName;
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'buyerCustomerParty.party.partyName')).toBe(true);
  });

  it('buyer missing postalAddress → 400', async () => {
    const order = makeOrder();
    delete order.buyerCustomerParty.party.postalAddress;
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'buyerCustomerParty.party.postalAddress')).toBe(true);
  });

  it('buyer missing streetName → 400', async () => {
    const order = makeOrder();
    delete order.buyerCustomerParty.party.postalAddress.streetName;
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'buyerCustomerParty.party.postalAddress.streetName')).toBe(true);
  });

  it('buyer missing cityName → 400', async () => {
    const order = makeOrder();
    delete order.buyerCustomerParty.party.postalAddress.cityName;
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'buyerCustomerParty.party.postalAddress.cityName')).toBe(true);
  });

  it('buyer missing postalZone → 400', async () => {
    const order = makeOrder();
    delete order.buyerCustomerParty.party.postalAddress.postalZone;
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'buyerCustomerParty.party.postalAddress.postalZone')).toBe(true);
  });

  it('buyer missing country → 400', async () => {
    const order = makeOrder();
    delete order.buyerCustomerParty.party.postalAddress.country;
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'buyerCustomerParty.party.postalAddress.country')).toBe(true);
  });

  it('seller missing partyName → 400', async () => {
    const order = makeOrder();
    delete order.sellerSupplierParty.party.partyName;
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'sellerSupplierParty.party.partyName')).toBe(true);
  });

  it('seller missing postalAddress → 400', async () => {
    const order = makeOrder();
    delete order.sellerSupplierParty.party.postalAddress;
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'sellerSupplierParty.party.postalAddress')).toBe(true);
  });

  it('originator party validation when provided', async () => {
    const order = makeOrder({
      originatorCustomerParty: { party: { postalAddress: VALID_ADDRESS } },
    });
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'originatorCustomerParty.party.partyName')).toBe(true);
  });
});

// ─── 7. Optional sections with invalid data ─────────────────────────────────
describe('Optional sections with invalid data', () => {
  // taxTotal
  it('taxTotal missing taxAmount → 400', async () => {
    const res = await post(makeOrder({ taxTotal: { currencyID: 'AUD' } }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'taxTotal.taxAmount')).toBe(true);
  });

  it('taxTotal missing currencyID → 400', async () => {
    const res = await post(makeOrder({ taxTotal: { taxAmount: 10 } }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'taxTotal.currencyID')).toBe(true);
  });

  it('taxTotal invalid currencyID → 400', async () => {
    const res = await post(makeOrder({ taxTotal: { taxAmount: 10, currencyID: 'FAKE' } }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'taxTotal.currencyID')).toBe(true);
  });

  it('taxSubtotal missing fields → 400', async () => {
    const res = await post(makeOrder({
      taxTotal: { taxAmount: 10, currencyID: 'AUD', taxSubtotal: [{}] },
    }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'taxTotal.taxSubtotal[0].taxableAmount')).toBe(true);
    expect(res.body.errors.some((e: any) => e.field === 'taxTotal.taxSubtotal[0].taxAmount')).toBe(true);
    expect(res.body.errors.some((e: any) => e.field === 'taxTotal.taxSubtotal[0].taxCategory')).toBe(true);
  });

  it('taxSubtotal missing taxScheme → 400', async () => {
    const res = await post(makeOrder({
      taxTotal: { taxAmount: 10, currencyID: 'AUD', taxSubtotal: [{ taxableAmount: 100, taxAmount: 10, taxCategory: {} }] },
    }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'taxTotal.taxSubtotal[0].taxCategory.taxScheme')).toBe(true);
  });

  // allowanceCharge
  it('allowanceCharge missing chargeIndicator → 400', async () => {
    const res = await post(makeOrder({ allowanceCharge: [{ amount: 10, currencyID: 'AUD' }] }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'allowanceCharge[0].chargeIndicator')).toBe(true);
  });

  it('allowanceCharge missing amount → 400', async () => {
    const res = await post(makeOrder({ allowanceCharge: [{ chargeIndicator: true, currencyID: 'AUD' }] }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'allowanceCharge[0].amount')).toBe(true);
  });

  it('allowanceCharge missing currencyID → 400', async () => {
    const res = await post(makeOrder({ allowanceCharge: [{ chargeIndicator: true, amount: 10 }] }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'allowanceCharge[0].currencyID')).toBe(true);
  });

  it('allowanceCharge invalid currencyID → 400', async () => {
    const res = await post(makeOrder({ allowanceCharge: [{ chargeIndicator: true, amount: 10, currencyID: 'ZZZ' }] }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'allowanceCharge[0].currencyID')).toBe(true);
  });

  it('multiple allowanceCharge entries validated independently', async () => {
    const res = await post(makeOrder({
      allowanceCharge: [
        { chargeIndicator: true, amount: 10, currencyID: 'AUD' },
        { chargeIndicator: false, currencyID: 'AUD' },
      ],
    }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'allowanceCharge[1].amount')).toBe(true);
  });

  // paymentMeans
  it('paymentMeans missing code → 400', async () => {
    const res = await post(makeOrder({ paymentMeans: {} }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'paymentMeans.paymentMeansCode')).toBe(true);
  });

  it('paymentMeans invalid date → 400', async () => {
    const res = await post(makeOrder({ paymentMeans: { paymentMeansCode: '30', paymentDueDate: 'not-a-date' } }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'paymentMeans.paymentDueDate')).toBe(true);
  });

  it('paymentMeans valid → 200', async () => {
    const res = await post(makeOrder({ paymentMeans: { paymentMeansCode: '30', paymentDueDate: '2026-06-01' } }), apiKey);
    expect(res.status).toBe(200);
  });

  // delivery
  it('delivery with invalid address → 400', async () => {
    const res = await post(makeOrder({ delivery: { deliveryAddress: { streetName: '1 St' } } }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field.startsWith('delivery.deliveryAddress'))).toBe(true);
  });

  it('delivery with invalid period dates → 400', async () => {
    const res = await post(makeOrder({ delivery: { requestedDeliveryPeriod: { startDate: 'bad', endDate: 'bad' } } }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field.includes('requestedDeliveryPeriod'))).toBe(true);
  });

  it('delivery valid → 200', async () => {
    const res = await post(makeOrder({ delivery: { deliveryAddress: VALID_ADDRESS, requestedDeliveryPeriod: { startDate: '2026-02-01', endDate: '2026-02-28' } } }), apiKey);
    expect(res.status).toBe(200);
  });

  // document references
  it('quotationDocumentReference missing id → 400', async () => {
    const res = await post(makeOrder({ quotationDocumentReference: {} }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'quotationDocumentReference.id')).toBe(true);
  });

  it('orderDocumentReference missing id → 400', async () => {
    const res = await post(makeOrder({ orderDocumentReference: {} }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'orderDocumentReference.id')).toBe(true);
  });

  it('originatorDocumentReference missing id → 400', async () => {
    const res = await post(makeOrder({ originatorDocumentReference: {} }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'originatorDocumentReference.id')).toBe(true);
  });

  it('valid document references → 200', async () => {
    const res = await post(makeOrder({
      quotationDocumentReference: { id: 'Q1' },
      orderDocumentReference: { id: 'O1' },
      originatorDocumentReference: { id: 'OR1' },
      additionalDocumentReference: [{ id: 'AD1' }],
    }), apiKey);
    expect(res.status).toBe(200);
  });

  // validityPeriod
  it('validityPeriod with invalid startDate → 400', async () => {
    const res = await post(makeOrder({ validityPeriod: { startDate: 'nope' } }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'validityPeriod.startDate')).toBe(true);
  });

  it('validityPeriod with invalid endDate → 400', async () => {
    const res = await post(makeOrder({ validityPeriod: { endDate: 'nope' } }), apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'validityPeriod.endDate')).toBe(true);
  });

  it('validityPeriod valid → 200', async () => {
    const res = await post(makeOrder({ validityPeriod: { startDate: '2026-01-01', endDate: '2026-12-31' } }), apiKey);
    expect(res.status).toBe(200);
  });

  // lineItem delivery and classifiedTaxCategory
  it('lineItem delivery with invalid address → 400', async () => {
    const order = makeOrder();
    order.orderLines[0].lineItem.delivery = { deliveryAddress: { streetName: '1 St' } };
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field.includes('delivery.deliveryAddress'))).toBe(true);
  });

  it('lineItem classifiedTaxCategory missing taxScheme → 400', async () => {
    const order = makeOrder();
    order.orderLines[0].lineItem.item.classifiedTaxCategory = { percent: 10 };
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field.includes('classifiedTaxCategory.taxScheme'))).toBe(true);
  });
});

// ─── 8. Multiple validation errors ──────────────────────────────────────────
describe('Multiple validation errors', () => {
  it('many required fields missing → 500 (calculateMonetaryTotal crashes before validation)', async () => {
    const order = { issueDate: 'bad' };
    const res = await post(order, apiKey);
    // calculateMonetaryTotal crashes on missing orderLines before validation runs
    expect(res.status).toBe(500);
  });

  it('errors from different sections simultaneously', async () => {
    const order = makeOrder({
      issueDate: 'bad',
      taxTotal: { currencyID: 'FAKE' },
      orderLines: [],
    });
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    const fields = res.body.errors.map((e: any) => e.field);
    expect(fields).toContain('issueDate');
    expect(fields).toContain('orderLines');
  });
});

// ─── 9. Response shape ──────────────────────────────────────────────────────
describe('Response shape', () => {
  it('id is a valid UUID', async () => {
    const res = await post(makeOrder(), apiKey);
    expect(res.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('xmlUrl format matches /orders/{id}/xml', async () => {
    const res = await post(makeOrder(), apiKey);
    expect(res.body.xmlUrl).toBe(`/orders/${res.body.id}/xml`);
  });

  it('createdAt is a recent valid date', async () => {
    const res = await post(makeOrder(), apiKey);
    const created = new Date(res.body.createdAt);
    expect(created.getTime()).not.toBeNaN();
    expect(Date.now() - created.getTime()).toBeLessThan(10000);
  });

  it('anticipatedMonetaryTotal has all numeric fields', async () => {
    const res = await post(makeOrder(), apiKey);
    const total = res.body.anticipatedMonetaryTotal;
    expect(typeof total.lineExtensionAmount).toBe('number');
    expect(typeof total.taxExclusiveAmount).toBe('number');
    expect(typeof total.taxInclusiveAmount).toBe('number');
    expect(typeof total.allowanceTotalAmount).toBe('number');
    expect(typeof total.chargeTotalAmount).toBe('number');
    expect(typeof total.payableAmount).toBe('number');
  });

  it('no internal fields (_id, __v) leaked', async () => {
    const res = await post(makeOrder(), apiKey);
    expect(res.body._id).toBeUndefined();
    expect(res.body.__v).toBeUndefined();
  });
});

// ─── 10. Recurring orders – happy path ──────────────────────────────────────
describe('Recurring orders - happy path', () => {
  const recurringBase = () => makeOrder({
    recurring: true,
    frequency: 'Daily',
    startDate: '2026-03-15T09:00:00Z',
  });

  it('Daily recurring order → 200 with correct response', async () => {
    const res = await post(recurringBase(), apiKey);
    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
    expect(res.body.frequency).toBe('Daily');
    expect(res.body.startDate).toBe('2026-03-15T09:00:00Z');
    expect(res.body.createdAt).toBeDefined();
  });

  it('Weekly recurring order → 200', async () => {
    const order = recurringBase();
    order.frequency = 'Weekly';
    const res = await post(order, apiKey);
    expect(res.status).toBe(200);
    expect(res.body.frequency).toBe('Weekly');
  });

  it('Monthly recurring order → 200', async () => {
    const order = recurringBase();
    order.frequency = 'Monthly';
    const res = await post(order, apiKey);
    expect(res.status).toBe(200);
    expect(res.body.frequency).toBe('Monthly');
  });

  it('persisted with 5 instances', async () => {
    const res = await post(recurringBase(), apiKey);
    const saved = await RecurringOrderModel.findOne({ id: res.body.id });
    expect(saved).not.toBeNull();
    expect(saved!.orderInstances).toHaveLength(5);
  });

  it('template order has recurring fields stripped', async () => {
    const res = await post(recurringBase(), apiKey);
    const saved = await RecurringOrderModel.findOne({ id: res.body.id });
    const template = saved!.order as any;
    expect(template.recurring).toBeUndefined();
    expect(template.frequency).toBeUndefined();
    expect(template.startDate).toBeUndefined();
  });
});

// ─── 11. Recurring orders – validation ──────────────────────────────────────
describe('Recurring orders - validation', () => {
  const recurringBase = () => makeOrder({
    recurring: true,
    frequency: 'Daily',
    startDate: '2026-03-15T09:00:00Z',
  });

  it('missing frequency → 400', async () => {
    const order = recurringBase();
    delete order.frequency;
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'frequency')).toBe(true);
  });

  it('invalid frequency → 400', async () => {
    const order = recurringBase();
    order.frequency = 'Yearly';
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'frequency')).toBe(true);
  });

  it('empty frequency → 400', async () => {
    const order = recurringBase();
    order.frequency = '';
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
  });

  it('missing startDate → 400', async () => {
    const order = recurringBase();
    delete order.startDate;
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'startDate')).toBe(true);
  });

  it('invalid startDate → 400', async () => {
    const order = recurringBase();
    order.startDate = 'not-a-date';
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'startDate')).toBe(true);
  });

  it('empty startDate → 400', async () => {
    const order = recurringBase();
    order.startDate = '';
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
  });

  it('template validation still runs (e.g. missing documentCurrencyCode)', async () => {
    const order = recurringBase();
    delete order.documentCurrencyCode;
    const res = await post(order, apiKey);
    expect(res.status).toBe(400);
    expect(res.body.errors.some((e: any) => e.field === 'documentCurrencyCode')).toBe(true);
  });

  it('recurring: "true" (string) → treated as standard order', async () => {
    const order = makeOrder({ recurring: 'true', frequency: 'Daily', startDate: '2026-03-15T09:00:00Z' });
    const res = await post(order, apiKey);
    // Should be treated as a standard order (recurring !== true boolean)
    expect(res.status).toBe(200);
    // Standard order response has xmlUrl, recurring response does not
    expect(res.body.xmlUrl).toBeDefined();
  });
});

// ─── 12. Edge cases ─────────────────────────────────────────────────────────
describe('Edge cases', () => {
  it('very small positive quantity (0.001) → 200', async () => {
    const order = makeOrder();
    order.orderLines[0].lineItem.quantity = 0.001;
    const res = await post(order, apiKey);
    expect(res.status).toBe(200);
  });

  it('priceAmount = 0 → 200', async () => {
    const order = makeOrder();
    order.orderLines[0].lineItem.price.priceAmount = 0;
    const res = await post(order, apiKey);
    expect(res.status).toBe(200);
    expect(res.body.anticipatedMonetaryTotal.lineExtensionAmount).toBe(0);
  });

  it('large number of order lines (50) → 200', async () => {
    const lines = Array.from({ length: 50 }, (_, i) => ({
      lineItem: {
        id: `line-${i}`,
        quantity: 1,
        price: { priceAmount: 1, currencyID: 'AUD' },
        item: { name: `Item ${i}` },
      },
    }));
    const res = await post(makeOrder({ orderLines: lines }), apiKey);
    expect(res.status).toBe(200);
    expect(res.body.anticipatedMonetaryTotal.lineExtensionAmount).toBe(50);
  });

  it('validation error shape is { errors: [...] } vs auth error { error: "..." }', async () => {
    // Auth error
    const authRes = await post(makeOrder(), 'bad-key');
    expect(authRes.status).toBe(401);
    expect(typeof authRes.body.error).toBe('string');
    expect(authRes.body.errors).toBeUndefined();

    // Validation error (use a body that has orderLines so calculateMonetaryTotal doesn't crash)
    const valRes = await post({ orderLines: [{ lineItem: { id: '1', quantity: 1, price: { priceAmount: 1, currencyID: 'AUD' }, item: { name: 'X' } } }] }, apiKey);
    expect(valRes.status).toBe(400);
    expect(Array.isArray(valRes.body.errors)).toBe(true);
    expect(valRes.body.error).toBeUndefined();
  });
});
