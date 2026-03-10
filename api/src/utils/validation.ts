// Order Validation helper functions

import { ApiKey } from '../models/apiKey';
import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';

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
