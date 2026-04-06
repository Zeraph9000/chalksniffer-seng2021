import { describe, expect, test } from '@jest/globals';
import { validateOrder } from '../src/utils/validation';
import type { Order } from '../src/types';

function baseOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'test-id',
    issueDate: '2026-01-01',
    documentCurrencyCode: 'AUD',
    buyerCustomerParty: {
      party: {
        partyName: 'Buyer Co',
        postalAddress: { streetName: '1 St', cityName: 'Sydney', postalZone: '2000', country: 'AU' },
      },
    },
    sellerSupplierParty: {
      party: {
        partyName: 'Seller Co',
        postalAddress: { streetName: '2 Ave', cityName: 'Melbourne', postalZone: '3000', country: 'AU' },
      },
    },
    orderLines: [
      {
        lineItem: {
          id: 'line-1',
          quantity: 1,
          price: { priceAmount: 10, currencyID: 'AUD' },
          item: { name: 'Widget' },
        },
      },
    ],
    ...overrides,
  } as Order;
}

describe('validateOrder', () => {
  test('returns valid for a minimal correct order', () => {
    expect(validateOrder(baseOrder()).res).toBe(true);
  });

  // --- required fields ---
  test('missing id', () => {
    const r = validateOrder(baseOrder({ id: '' }));
    expect(r.res).toBe(false);
    expect(r.errors.some(e => e.field === 'id')).toBe(true);
  });

  test('missing issueDate', () => {
    const r = validateOrder(baseOrder({ issueDate: '' }));
    expect(r.res).toBe(false);
    expect(r.errors.some(e => e.field === 'issueDate')).toBe(true);
  });

  test('invalid issueDate format', () => {
    const r = validateOrder(baseOrder({ issueDate: '01-01-2026' }));
    expect(r.res).toBe(false);
    expect(r.errors.some(e => e.field === 'issueDate')).toBe(true);
  });

  test('invalid issueTime format', () => {
    const r = validateOrder(baseOrder({ issueTime: '9:00' } as any));
    expect(r.res).toBe(false);
    expect(r.errors.some(e => e.field === 'issueTime')).toBe(true);
  });

  test('valid issueTime is accepted', () => {
    expect(validateOrder(baseOrder({ issueTime: '09:00:00' } as any)).res).toBe(true);
  });

  test('missing documentCurrencyCode', () => {
    const r = validateOrder(baseOrder({ documentCurrencyCode: '' }));
    expect(r.res).toBe(false);
    expect(r.errors.some(e => e.field === 'documentCurrencyCode')).toBe(true);
  });

  test('invalid documentCurrencyCode', () => {
    const r = validateOrder(baseOrder({ documentCurrencyCode: 'ZZZ' }));
    expect(r.res).toBe(false);
    expect(r.errors.some(e => e.field === 'documentCurrencyCode')).toBe(true);
  });

  test('invalid pricingCurrencyCode', () => {
    const r = validateOrder(baseOrder({ pricingCurrencyCode: 'NOPE' } as any));
    expect(r.res).toBe(false);
    expect(r.errors.some(e => e.field === 'pricingCurrencyCode')).toBe(true);
  });

  test('valid pricingCurrencyCode is accepted', () => {
    expect(validateOrder(baseOrder({ pricingCurrencyCode: 'USD' } as any)).res).toBe(true);
  });

  test('invalid taxCurrencyCode', () => {
    const r = validateOrder(baseOrder({ taxCurrencyCode: 'BAD' } as any));
    expect(r.res).toBe(false);
    expect(r.errors.some(e => e.field === 'taxCurrencyCode')).toBe(true);
  });

  // --- validityPeriod ---
  test('invalid validityPeriod startDate', () => {
    const r = validateOrder(baseOrder({ validityPeriod: { startDate: 'bad', endDate: '2026-12-31' } } as any));
    expect(r.res).toBe(false);
    expect(r.errors.some(e => e.field === 'validityPeriod.startDate')).toBe(true);
  });

  test('invalid validityPeriod endDate', () => {
    const r = validateOrder(baseOrder({ validityPeriod: { startDate: '2026-01-01', endDate: 'bad' } } as any));
    expect(r.res).toBe(false);
    expect(r.errors.some(e => e.field === 'validityPeriod.endDate')).toBe(true);
  });

  test('valid validityPeriod is accepted', () => {
    expect(validateOrder(baseOrder({ validityPeriod: { startDate: '2026-01-01', endDate: '2026-12-31' } } as any)).res).toBe(true);
  });

  // --- buyer/seller parties ---
  test('address missing country', () => {
    const r = validateOrder(baseOrder({
      buyerCustomerParty: {
        party: {
          partyName: 'Buyer',
          postalAddress: { streetName: '1 St', cityName: 'Sydney', postalZone: '2000', country: '' },
        },
      },
    } as any));
    expect(r.errors.some(e => e.field === 'buyerCustomerParty.party.postalAddress.country')).toBe(true);
  });

  test('party missing postalAddress', () => {
    const r = validateOrder(baseOrder({
      buyerCustomerParty: {
        party: { partyName: 'Buyer', postalAddress: null as any },
      },
    } as any));
    expect(r.errors.some(e => e.field === 'buyerCustomerParty.party.postalAddress')).toBe(true);
  });

  test('missing buyerCustomerParty', () => {
    const r = validateOrder(baseOrder({ buyerCustomerParty: undefined as any }));
    expect(r.errors.some(e => e.field === 'buyerCustomerParty')).toBe(true);
  });

  test('missing buyerCustomerParty.party', () => {
    const r = validateOrder(baseOrder({ buyerCustomerParty: {} as any }));
    expect(r.errors.some(e => e.field === 'buyerCustomerParty.party')).toBe(true);
  });

  test('missing sellerSupplierParty', () => {
    const r = validateOrder(baseOrder({ sellerSupplierParty: undefined as any }));
    expect(r.errors.some(e => e.field === 'sellerSupplierParty')).toBe(true);
  });

  test('missing sellerSupplierParty.party', () => {
    const r = validateOrder(baseOrder({ sellerSupplierParty: {} as any }));
    expect(r.errors.some(e => e.field === 'sellerSupplierParty.party')).toBe(true);
  });

  // --- orderLines ---
  test('missing orderLines', () => {
    const r = validateOrder(baseOrder({ orderLines: undefined as any }));
    expect(r.errors.some(e => e.field === 'orderLines')).toBe(true);
  });

  test('empty orderLines array', () => {
    const r = validateOrder(baseOrder({ orderLines: [] }));
    expect(r.errors.some(e => e.field === 'orderLines')).toBe(true);
  });

  test('orderLine missing lineItem', () => {
    const r = validateOrder(baseOrder({ orderLines: [{} as any] }));
    expect(r.errors.some(e => e.field === 'orderLines[0].lineItem')).toBe(true);
  });

  test('lineItem missing id', () => {
    const r = validateOrder(baseOrder({
      orderLines: [{ lineItem: { id: '', quantity: 1, price: { priceAmount: 10, currencyID: 'AUD' }, item: { name: 'X' } } }],
    }));
    expect(r.errors.some(e => e.field === 'orderLines[0].lineItem.id')).toBe(true);
  });

  test('lineItem missing quantity', () => {
    const r = validateOrder(baseOrder({
      orderLines: [{ lineItem: { id: '1', quantity: null as any, price: { priceAmount: 10, currencyID: 'AUD' }, item: { name: 'X' } } }],
    }));
    expect(r.errors.some(e => e.field === 'orderLines[0].lineItem.quantity')).toBe(true);
  });

  test('lineItem quantity <= 0', () => {
    const r = validateOrder(baseOrder({
      orderLines: [{ lineItem: { id: '1', quantity: 0, price: { priceAmount: 10, currencyID: 'AUD' }, item: { name: 'X' } } }],
    }));
    expect(r.errors.some(e => e.field === 'orderLines[0].lineItem.quantity')).toBe(true);
  });

  test('lineItem missing price', () => {
    const r = validateOrder(baseOrder({
      orderLines: [{ lineItem: { id: '1', quantity: 1, price: null as any, item: { name: 'X' } } }],
    }));
    expect(r.errors.some(e => e.field === 'orderLines[0].lineItem.price')).toBe(true);
  });

  test('lineItem missing price.priceAmount', () => {
    const r = validateOrder(baseOrder({
      orderLines: [{ lineItem: { id: '1', quantity: 1, price: { priceAmount: null as any, currencyID: 'AUD' }, item: { name: 'X' } } }],
    }));
    expect(r.errors.some(e => e.field === 'orderLines[0].lineItem.price.priceAmount')).toBe(true);
  });

  test('lineItem missing price.currencyID', () => {
    const r = validateOrder(baseOrder({
      orderLines: [{ lineItem: { id: '1', quantity: 1, price: { priceAmount: 10, currencyID: '' }, item: { name: 'X' } } }],
    }));
    expect(r.errors.some(e => e.field === 'orderLines[0].lineItem.price.currencyID')).toBe(true);
  });

  test('lineItem invalid price.currencyID', () => {
    const r = validateOrder(baseOrder({
      orderLines: [{ lineItem: { id: '1', quantity: 1, price: { priceAmount: 10, currencyID: 'FAKE' }, item: { name: 'X' } } }],
    }));
    expect(r.errors.some(e => e.field === 'orderLines[0].lineItem.price.currencyID')).toBe(true);
  });

  test('lineItem missing item', () => {
    const r = validateOrder(baseOrder({
      orderLines: [{ lineItem: { id: '1', quantity: 1, price: { priceAmount: 10, currencyID: 'AUD' }, item: null as any } }],
    }));
    expect(r.errors.some(e => e.field === 'orderLines[0].lineItem.item')).toBe(true);
  });

  test('lineItem missing item.name', () => {
    const r = validateOrder(baseOrder({
      orderLines: [{ lineItem: { id: '1', quantity: 1, price: { priceAmount: 10, currencyID: 'AUD' }, item: { name: '' } } }],
    }));
    expect(r.errors.some(e => e.field === 'orderLines[0].lineItem.item.name')).toBe(true);
  });

  test('lineItem item with invalid classifiedTaxCategory', () => {
    const r = validateOrder(baseOrder({
      orderLines: [{ lineItem: { id: '1', quantity: 1, price: { priceAmount: 10, currencyID: 'AUD' }, item: { name: 'X', classifiedTaxCategory: { taxScheme: '' } } } }],
    }));
    expect(r.errors.some(e => e.field === 'orderLines[0].lineItem.item.classifiedTaxCategory.taxScheme')).toBe(true);
  });

  test('lineItem with delivery is validated', () => {
    const r = validateOrder(baseOrder({
      orderLines: [{
        lineItem: {
          id: '1', quantity: 1, price: { priceAmount: 10, currencyID: 'AUD' }, item: { name: 'X' },
          delivery: { deliveryAddress: { streetName: '', cityName: 'X', postalZone: '1000', country: 'AU' } },
        },
      }],
    }));
    expect(r.errors.some(e => e.field.includes('delivery'))).toBe(true);
  });

  // --- taxTotal ---
  test('taxTotal missing taxAmount', () => {
    const r = validateOrder(baseOrder({ taxTotal: { taxAmount: null as any, currencyID: 'AUD' } } as any));
    expect(r.errors.some(e => e.field === 'taxTotal.taxAmount')).toBe(true);
  });

  test('taxTotal missing currencyID', () => {
    const r = validateOrder(baseOrder({ taxTotal: { taxAmount: 10, currencyID: '' } } as any));
    expect(r.errors.some(e => e.field === 'taxTotal.currencyID')).toBe(true);
  });

  test('taxTotal invalid currencyID', () => {
    const r = validateOrder(baseOrder({ taxTotal: { taxAmount: 10, currencyID: 'NOPE' } } as any));
    expect(r.errors.some(e => e.field === 'taxTotal.currencyID')).toBe(true);
  });

  test('taxTotal with invalid taxSubtotal', () => {
    const r = validateOrder(baseOrder({
      taxTotal: {
        taxAmount: 10,
        currencyID: 'AUD',
        taxSubtotal: [{ taxableAmount: null as any, taxAmount: null as any, taxCategory: { taxScheme: '' } }],
      },
    } as any));
    expect(r.errors.some(e => e.field === 'taxTotal.taxSubtotal[0].taxableAmount')).toBe(true);
    expect(r.errors.some(e => e.field === 'taxTotal.taxSubtotal[0].taxAmount')).toBe(true);
    expect(r.errors.some(e => e.field === 'taxTotal.taxSubtotal[0].taxCategory.taxScheme')).toBe(true);
  });

  test('taxSubtotal missing taxCategory', () => {
    const r = validateOrder(baseOrder({
      taxTotal: {
        taxAmount: 10,
        currencyID: 'AUD',
        taxSubtotal: [{ taxableAmount: 10, taxAmount: 1, taxCategory: null as any }],
      },
    } as any));
    expect(r.errors.some(e => e.field === 'taxTotal.taxSubtotal[0].taxCategory')).toBe(true);
  });

  test('valid taxTotal is accepted', () => {
    expect(validateOrder(baseOrder({ taxTotal: { taxAmount: 10, currencyID: 'AUD' } } as any)).res).toBe(true);
  });

  // --- allowanceCharge ---
  test('allowanceCharge missing chargeIndicator', () => {
    const r = validateOrder(baseOrder({ allowanceCharge: [{ chargeIndicator: null as any, amount: 5, currencyID: 'AUD' }] } as any));
    expect(r.errors.some(e => e.field === 'allowanceCharge[0].chargeIndicator')).toBe(true);
  });

  test('allowanceCharge missing amount', () => {
    const r = validateOrder(baseOrder({ allowanceCharge: [{ chargeIndicator: false, amount: null as any, currencyID: 'AUD' }] } as any));
    expect(r.errors.some(e => e.field === 'allowanceCharge[0].amount')).toBe(true);
  });

  test('allowanceCharge missing currencyID', () => {
    const r = validateOrder(baseOrder({ allowanceCharge: [{ chargeIndicator: false, amount: 5, currencyID: '' }] } as any));
    expect(r.errors.some(e => e.field === 'allowanceCharge[0].currencyID')).toBe(true);
  });

  test('allowanceCharge invalid currencyID', () => {
    const r = validateOrder(baseOrder({ allowanceCharge: [{ chargeIndicator: false, amount: 5, currencyID: 'BAD' }] } as any));
    expect(r.errors.some(e => e.field === 'allowanceCharge[0].currencyID')).toBe(true);
  });

  test('valid allowanceCharge is accepted', () => {
    expect(validateOrder(baseOrder({ allowanceCharge: [{ chargeIndicator: false, amount: 5, currencyID: 'AUD' }] } as any)).res).toBe(true);
  });

  // --- paymentMeans ---
  test('paymentMeans missing paymentMeansCode', () => {
    const r = validateOrder(baseOrder({ paymentMeans: { paymentMeansCode: '' } } as any));
    expect(r.errors.some(e => e.field === 'paymentMeans.paymentMeansCode')).toBe(true);
  });

  test('paymentMeans invalid paymentDueDate', () => {
    const r = validateOrder(baseOrder({ paymentMeans: { paymentMeansCode: '30', paymentDueDate: 'bad-date' } } as any));
    expect(r.errors.some(e => e.field === 'paymentMeans.paymentDueDate')).toBe(true);
  });

  test('valid paymentMeans is accepted', () => {
    expect(validateOrder(baseOrder({ paymentMeans: { paymentMeansCode: '30', paymentDueDate: '2026-06-01' } } as any)).res).toBe(true);
  });

  // --- delivery ---
  test('delivery with invalid deliveryAddress', () => {
    const r = validateOrder(baseOrder({
      delivery: { deliveryAddress: { streetName: '', cityName: 'X', postalZone: '1000', country: 'AU' } },
    } as any));
    expect(r.errors.some(e => e.field === 'delivery.deliveryAddress.streetName')).toBe(true);
  });

  test('delivery with invalid requestedDeliveryPeriod', () => {
    const r = validateOrder(baseOrder({
      delivery: { requestedDeliveryPeriod: { startDate: 'bad' } },
    } as any));
    expect(r.errors.some(e => e.field === 'delivery.requestedDeliveryPeriod.startDate')).toBe(true);
  });

  test('valid delivery is accepted', () => {
    expect(validateOrder(baseOrder({
      delivery: { deliveryAddress: { streetName: '1 St', cityName: 'X', postalZone: '1000', country: 'AU' } },
    } as any)).res).toBe(true);
  });

  // --- document references ---
  test('quotationDocumentReference missing id', () => {
    const r = validateOrder(baseOrder({ quotationDocumentReference: { id: '' } } as any));
    expect(r.errors.some(e => e.field === 'quotationDocumentReference.id')).toBe(true);
  });

  test('orderDocumentReference missing id', () => {
    const r = validateOrder(baseOrder({ orderDocumentReference: { id: '' } } as any));
    expect(r.errors.some(e => e.field === 'orderDocumentReference.id')).toBe(true);
  });

  test('originatorDocumentReference missing id', () => {
    const r = validateOrder(baseOrder({ originatorDocumentReference: { id: '' } } as any));
    expect(r.errors.some(e => e.field === 'originatorDocumentReference.id')).toBe(true);
  });

  test('additionalDocumentReference missing id', () => {
    const r = validateOrder(baseOrder({ additionalDocumentReference: [{ id: '' }] } as any));
    expect(r.errors.some(e => e.field === 'additionalDocumentReference[0].id')).toBe(true);
  });

  test('valid document references are accepted', () => {
    expect(validateOrder(baseOrder({
      quotationDocumentReference: { id: 'q-1' },
      additionalDocumentReference: [{ id: 'a-1' }],
    } as any)).res).toBe(true);
  });

  // --- originatorCustomerParty ---
  test('originatorCustomerParty with invalid party is validated', () => {
    const r = validateOrder(baseOrder({
      originatorCustomerParty: {
        party: { partyName: '', postalAddress: { streetName: '1 St', cityName: 'X', postalZone: '1000', country: 'AU' } },
      },
    } as any));
    expect(r.errors.some(e => e.field === 'originatorCustomerParty.party.partyName')).toBe(true);
  });
});
