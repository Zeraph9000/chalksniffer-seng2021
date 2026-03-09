// Order Validation helper functions

import { ApiKey } from '../models/apiKey';
import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { Order, Address, Party, DocumentReference, TaxCategory, TaxSubtotal, TaxTotal, AllowanceCharge, PaymentMeans, Delivery, LineItem, Period, MonetaryTotal } from '../types';

// Validates API key against database
async function apiKeyValidation(apiKey: string): Promise<boolean> {
  // Take API key, verify that it exists in the database, if it does return true.
  // If it does not exist, return false.
  const found = await ApiKey.findOne({ apiKey: apiKey });
  return !!found;
}

// Validates date format is YYYY-MM-DD
function dateValidation(date: string): boolean {
  // Take date, verify that it is in the format YYYY-MM-DD, if it is return true.
  // If it is not, return false.
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  return regex.test(date);
}

// Validates time format is HH:MM:SS
function timeValidation(time: string): boolean {
  const regex = /^\d{2}:\d{2}:\d{2}$/;
  return regex.test(time);
}

// Validates currency code exists in ISO 4217 standard
const xmlData = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'chalksniffer-seng2021', 'currency-codes.xml'), 'utf8');
const parser = new XMLParser();
const parsed = parser.parse(xmlData);
const currencyCodes = parsed.ISO_4217.CcyTbl.CcyNtry.map((item: any) => item.Ccy);
function currencyValidation(currency: string): boolean {
  return currencyCodes.has(currency);
}

// Validates country code exists in ISO 3166-1 standard
const countryCodes = parsed.ISO_3166_1.CountryTbl.Country.map((item: any) => item.ISO);
function countryValidation(country: string): boolean {
  return countryCodes.has(country);
}

// Validates order against schema

type ValidationResult = { res: boolean; errors: ValidationError[] };
type ValidationError = { field: string; message: string };

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

function validateDocumentReference(ref: DocumentReference, prefix: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!ref.id) errors.push({ field: `${prefix}.id`, message: 'required' });
  return errors;
}

function validateTaxCategory(cat: TaxCategory, prefix: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!cat.taxScheme) errors.push({ field: `${prefix}.taxScheme`, message: 'required' });
  return errors;
}

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

function validatePaymentMeans(pm: PaymentMeans, prefix: string): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!pm.paymentMeansCode) errors.push({ field: `${prefix}.paymentMeansCode`, message: 'required' });
  if (pm.paymentDueDate && !dateValidation(pm.paymentDueDate)) {
    errors.push({ field: `${prefix}.paymentDueDate`, message: 'must be a valid date (YYYY-MM-DD)' });
  }
  return errors;
}

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

function validateOrder(order: Order): ValidationResult {
  const errors: ValidationError[] = [];

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

  if (order.originatorCustomerParty?.party) {
    errors.push(...validateParty(order.originatorCustomerParty.party, 'originatorCustomerParty.party'));
  }

  return { res: errors.length === 0, errors: errors };
}

function calculateMonetaryTotal(order: Order): MonetaryTotal {
  // Sum of quantity × priceAmount for each line item
  const lineExtensionAmount = order.orderLines.reduce((sum, line) => {
    const li = line.lineItem;
    return sum + li.quantity * li.price.priceAmount;
  }, 0);

  // Separate allowances (discounts) and charges (surcharges)
  let allowanceTotalAmount = 0;
  let chargeTotalAmount = 0;
  if (order.allowanceCharge) {
    for (const ac of order.allowanceCharge) {
      if (ac.chargeIndicator) {
        chargeTotalAmount += ac.amount;
      } else {
        allowanceTotalAmount += ac.amount;
      }
    }
  }

  // Tax-exclusive = line totals - allowances + charges
  const taxExclusiveAmount = lineExtensionAmount - allowanceTotalAmount + chargeTotalAmount;

  // Total tax from taxTotal if provided
  const totalTax = order.taxTotal?.taxAmount ?? 0;

  // Tax-inclusive = tax-exclusive + tax
  const taxInclusiveAmount = taxExclusiveAmount + totalTax;

  // Payable = tax-inclusive (same as final amount owed)
  const payableAmount = taxInclusiveAmount;

  return {
    lineExtensionAmount,
    taxExclusiveAmount,
    taxInclusiveAmount,
    allowanceTotalAmount,
    chargeTotalAmount,
    payableAmount,
  };
}

export { apiKeyValidation, dateValidation, timeValidation, currencyValidation, countryValidation, validateOrder, calculateMonetaryTotal };
export type { ValidationError };
