/**
 * Order validation utilities.
 *
 * Validates order documents against format and business rules:
 * - Date/time formats (YYYY-MM-DD, HH:MM:SS)
 * - ISO 4217 currency codes and ISO 3166-1 country codes (from reference XML)
 * - Required fields and nested structures (parties, line items, tax, delivery, etc.)
 */

import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { Order, Address, Party, DocumentReference, TaxCategory, TaxSubtotal, TaxTotal, AllowanceCharge, PaymentMeans, Delivery, LineItem, Period } from '../types';

// ---------------------------------------------------------------------------
// Primitive validators (date, time, currency, country)
// ---------------------------------------------------------------------------

/** Returns true if the string matches YYYY-MM-DD. */
function dateValidation(date: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  return regex.test(date);
}

/** Returns true if the string matches HH:MM:SS. */
function timeValidation(time: string): boolean {
  const regex = /^\d{2}:\d{2}:\d{2}$/;
  return regex.test(time);
}

// Load ISO reference data once at module load (currency and country codes)
const xmlData = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'currency-codes.xml'), 'utf8');
const parser = new XMLParser();
const parsed = parser.parse(xmlData);
const currencyCodes = new Set(parsed.ISO_4217.CcyTbl.CcyNtry.map((item: any) => item.Ccy));

/** Returns true if the code is a valid ISO 4217 currency code. */
function currencyValidation(currency: string): boolean {
  return currencyCodes.has(currency);
}


// ---------------------------------------------------------------------------
// Validation result types and field-level validators
// ---------------------------------------------------------------------------

/** Result of validating an order: success flag and list of field errors. */
type ValidationResult = { res: boolean; errors: ValidationError[] };
/** A single validation error with field path and message. */
type ValidationError = { field: string; message: string };

/**
 * Validates a period (start/end dates). Prefix is used for error field paths (e.g. "validityPeriod").
 */

function validatePeriod(period: Period, prefix: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (period.startDate && !dateValidation(period.startDate)) {
    errors.push({ field: `${prefix}.startDate`, message: 'must be a valid date (YYYY-MM-DD)' });
  }
  if (period.endDate && !dateValidation(period.endDate)) {
    errors.push({ field: `${prefix}.endDate`, message: 'must be a valid date (YYYY-MM-DD)' });
  }
  return errors;
}

/** Validates an address: required street, city, postal zone, and valid country code. */
function validateAddress(address: Address, prefix: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!address.streetName) errors.push({ field: `${prefix}.streetName`, message: 'required' });
  if (!address.cityName) errors.push({ field: `${prefix}.cityName`, message: 'required' });
  if (!address.postalZone) errors.push({ field: `${prefix}.postalZone`, message: 'required' });
  if (!address.country) {
    errors.push({ field: `${prefix}.country`, message: 'required' });
  } else if (!countryValidation(address.country)) {
    errors.push({ field: `${prefix}.country`, message: 'must be a valid ISO 3166-1 country code' });
  }
  return errors;
}

/** Validates a party: required name and postal address (including nested address validation). */
function validateParty(party: Party, prefix: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!party.partyName) errors.push({ field: `${prefix}.partyName`, message: 'required' });
  if (!party.postalAddress) {
    errors.push({ field: `${prefix}.postalAddress`, message: 'required' });
  } else {
    errors.push(...validateAddress(party.postalAddress, `${prefix}.postalAddress`));
  }
  return errors;
}

/** Validates a document reference: required id. */
function validateDocumentReference(ref: DocumentReference, prefix: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!ref.id) errors.push({ field: `${prefix}.id`, message: 'required' });
  return errors;
}

/** Validates a tax category: required tax scheme. */
function validateTaxCategory(cat: TaxCategory, prefix: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!cat.taxScheme) errors.push({ field: `${prefix}.taxScheme`, message: 'required' });
  return errors;
}

/** Validates a tax subtotal: required taxable amount, tax amount, and tax category. */
function validateTaxSubtotal(sub: TaxSubtotal, prefix: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (sub.taxableAmount == null) errors.push({ field: `${prefix}.taxableAmount`, message: 'required' });
  if (sub.taxAmount == null) errors.push({ field: `${prefix}.taxAmount`, message: 'required' });
  if (!sub.taxCategory) {
    errors.push({ field: `${prefix}.taxCategory`, message: 'required' });
  } else {
    errors.push(...validateTaxCategory(sub.taxCategory, `${prefix}.taxCategory`));
  }
  return errors;
}

/** Validates tax total: required amount, valid currency, and each tax subtotal if present. */
function validateTaxTotal(tax: TaxTotal, prefix: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (tax.taxAmount == null) errors.push({ field: `${prefix}.taxAmount`, message: 'required' });
  if (!tax.currencyID) {
    errors.push({ field: `${prefix}.currencyID`, message: 'required' });
  } else if (!currencyValidation(tax.currencyID)) {
    errors.push({ field: `${prefix}.currencyID`, message: 'must be a valid ISO 4217 currency code' });
  }
  if (tax.taxSubtotal) {
    tax.taxSubtotal.forEach((sub, i) => {
      errors.push(...validateTaxSubtotal(sub, `${prefix}.taxSubtotal[${i}]`));
    });
  }
  return errors;
}

/** Validates allowance/charge: required charge indicator, amount, and valid currency. */
function validateAllowanceCharge(ac: AllowanceCharge, prefix: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (ac.chargeIndicator == null) errors.push({ field: `${prefix}.chargeIndicator`, message: 'required' });
  if (ac.amount == null) errors.push({ field: `${prefix}.amount`, message: 'required' });
  if (!ac.currencyID) {
    errors.push({ field: `${prefix}.currencyID`, message: 'required' });
  } else if (!currencyValidation(ac.currencyID)) {
    errors.push({ field: `${prefix}.currencyID`, message: 'must be a valid ISO 4217 currency code' });
  }
  return errors;
}

/** Validates payment means: required code and optional valid payment due date. */
function validatePaymentMeans(pm: PaymentMeans, prefix: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!pm.paymentMeansCode) errors.push({ field: `${prefix}.paymentMeansCode`, message: 'required' });
  if (pm.paymentDueDate && !dateValidation(pm.paymentDueDate)) {
    errors.push({ field: `${prefix}.paymentDueDate`, message: 'must be a valid date (YYYY-MM-DD)' });
  }
  return errors;
}

/** Validates delivery: optional address and requested delivery period (both validated if present). */
function validateDelivery(delivery: Delivery, prefix: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (delivery.deliveryAddress) {
    errors.push(...validateAddress(delivery.deliveryAddress, `${prefix}.deliveryAddress`));
  }
  if (delivery.requestedDeliveryPeriod) {
    errors.push(...validatePeriod(delivery.requestedDeliveryPeriod, `${prefix}.requestedDeliveryPeriod`));
  }
  return errors;
}

/**
 * Validates a line item: id, quantity (> 0), price (amount + currency), item (name, optional tax category),
 * and optional delivery.
 */
function validateLineItem(li: LineItem, prefix: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!li.id) errors.push({ field: `${prefix}.id`, message: 'required' });
  if (li.quantity == null) {
    errors.push({ field: `${prefix}.quantity`, message: 'required' });
  } else if (li.quantity <= 0) {
    errors.push({ field: `${prefix}.quantity`, message: 'must be a positive number' });
  }
  if (!li.price) {
    errors.push({ field: `${prefix}.price`, message: 'required' });
  } else {
    if (li.price.priceAmount == null) errors.push({ field: `${prefix}.price.priceAmount`, message: 'required' });
    if (!li.price.currencyID) {
      errors.push({ field: `${prefix}.price.currencyID`, message: 'required' });
    } else if (!currencyValidation(li.price.currencyID)) {
      errors.push({ field: `${prefix}.price.currencyID`, message: 'must be a valid ISO 4217 currency code' });
    }
  }
  if (!li.item) {
    errors.push({ field: `${prefix}.item`, message: 'required' });
  } else {
    if (!li.item.name) errors.push({ field: `${prefix}.item.name`, message: 'required' });
    if (li.item.classifiedTaxCategory) {
      errors.push(...validateTaxCategory(li.item.classifiedTaxCategory, `${prefix}.item.classifiedTaxCategory`));
    }
  }
  if (li.delivery) {
    errors.push(...validateDelivery(li.delivery, `${prefix}.delivery`));
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Main order validator
// ---------------------------------------------------------------------------

/**
 * Validates a full order. Collects all validation errors and returns { res: true, errors: [] } when valid,
 * or { res: false, errors: [...] } with field paths and messages for each invalid field.
 */
function validateOrder(order: Order): ValidationResult {
  const errors: ValidationError[] = [];

  // Order header: id, dates, and currency codes
  if (!order.id) errors.push({ field: 'id', message: 'required' });
  if (!order.issueDate) {
    errors.push({ field: 'issueDate', message: 'required' });
  } else if (!dateValidation(order.issueDate)) {
    errors.push({ field: 'issueDate', message: 'must be a valid date (YYYY-MM-DD)' });
  }
  if (order.issueTime && !timeValidation(order.issueTime)) {
    errors.push({ field: 'issueTime', message: 'must be a valid time (HH:MM:SS)' });
  }
  if (!order.documentCurrencyCode) {
    errors.push({ field: 'documentCurrencyCode', message: 'required' });
  } else if (!currencyValidation(order.documentCurrencyCode)) {
    errors.push({ field: 'documentCurrencyCode', message: 'must be a valid ISO 4217 currency code' });
  }
  if (order.pricingCurrencyCode && !currencyValidation(order.pricingCurrencyCode)) {
    errors.push({ field: 'pricingCurrencyCode', message: 'must be a valid ISO 4217 currency code' });
  }
  if (order.taxCurrencyCode && !currencyValidation(order.taxCurrencyCode)) {
    errors.push({ field: 'taxCurrencyCode', message: 'must be a valid ISO 4217 currency code' });
  }

  if (order.validityPeriod) {
    errors.push(...validatePeriod(order.validityPeriod, 'validityPeriod'));
  }

  // Buyer and seller parties (required)
  if (!order.buyerCustomerParty) {
    errors.push({ field: 'buyerCustomerParty', message: 'required' });
  } else if (!order.buyerCustomerParty.party) {
    errors.push({ field: 'buyerCustomerParty.party', message: 'required' });
  } else {
    errors.push(...validateParty(order.buyerCustomerParty.party, 'buyerCustomerParty.party'));
  }

  if (!order.sellerSupplierParty) {
    errors.push({ field: 'sellerSupplierParty', message: 'required' });
  } else if (!order.sellerSupplierParty.party) {
    errors.push({ field: 'sellerSupplierParty.party', message: 'required' });
  } else {
    errors.push(...validateParty(order.sellerSupplierParty.party, 'sellerSupplierParty.party'));
  }

  // Order lines: at least one line, each with a valid lineItem
  if (!order.orderLines || !Array.isArray(order.orderLines)) {
    errors.push({ field: 'orderLines', message: 'required' });
  } else if (order.orderLines.length === 0) {
    errors.push({ field: 'orderLines', message: 'must contain at least one order line' });
  } else {
    order.orderLines.forEach((line, i) => {
      if (!line.lineItem) {
        errors.push({ field: `orderLines[${i}].lineItem`, message: 'required' });
      } else {
        errors.push(...validateLineItem(line.lineItem, `orderLines[${i}].lineItem`));
      }
    });
  }

  // Optional sections: tax total, allowance/charge, payment means, delivery
  if (order.taxTotal) {
    errors.push(...validateTaxTotal(order.taxTotal, 'taxTotal'));
  }
  if (order.allowanceCharge) {
    order.allowanceCharge.forEach((ac, i) => {
      errors.push(...validateAllowanceCharge(ac, `allowanceCharge[${i}]`));
    });
  }
  if (order.paymentMeans) {
    errors.push(...validatePaymentMeans(order.paymentMeans, 'paymentMeans'));
  }
  if (order.delivery) {
    errors.push(...validateDelivery(order.delivery, 'delivery'));
  }

  // Document references: quotation, order, originator, and additional references
  const namedDocRefs: [string, DocumentReference | undefined][] = [
    ['quotationDocumentReference', order.quotationDocumentReference],
    ['orderDocumentReference', order.orderDocumentReference],
    ['originatorDocumentReference', order.originatorDocumentReference],
  ];
  for (const [name, ref] of namedDocRefs) {
    if (ref) errors.push(...validateDocumentReference(ref, name));
  }
  if (order.additionalDocumentReference) {
    order.additionalDocumentReference.forEach((ref, i) => {
      errors.push(...validateDocumentReference(ref, `additionalDocumentReference[${i}]`));
    });
  }

  // Optional originator party
  if (order.originatorCustomerParty?.party) {
    errors.push(...validateParty(order.originatorCustomerParty.party, 'originatorCustomerParty.party'));
  }

  return { res: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { dateValidation, timeValidation, currencyValidation, countryValidation, validateOrder };
export type { ValidationError };
