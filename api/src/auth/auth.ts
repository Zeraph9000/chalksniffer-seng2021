import mongoose from 'mongoose';
import { UserMap } from '../models/userMap';
import crypto from 'crypto';

// Validates API key against database
export async function apiKeyValidation(apiKey: string): Promise<boolean> {
  const found = await UserMap.findOne({ apiKey });
  return !!found;
}

// Generates a new user with a random API key and stores the mapping
export async function createUser(): Promise<string> {
  const userId = new mongoose.Types.ObjectId().toString();
  const apiKey = crypto.randomBytes(32).toString('hex');

  await UserMap.create({ userId, apiKey });
  return apiKey;
}

// Looks up the internal userId for a given API key
export async function getUserId(apiKey: string): Promise<string | null> {
  const mapping = await UserMap.findOne({ apiKey });
  return mapping?.userId ?? null;
}
