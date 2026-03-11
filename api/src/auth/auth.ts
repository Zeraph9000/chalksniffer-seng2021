import mongoose from 'mongoose';
import { UserMap } from '../models/userMap';
import crypto from 'crypto';

// Validates API key against database
export async function apiKeyValidation(apiKey: string): Promise<boolean> {
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
  const found = await UserMap.exists({ apiKey: hashedKey });
  return !!found;
}

// Generates a new user with a random API key and stores the mapping
export async function createUser(): Promise<string> {
  const userId = new mongoose.Types.ObjectId().toString();
  const apiKey = crypto.randomBytes(32).toString('hex');

  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
  await UserMap.create({ userId, apiKey: hashedKey });
  return apiKey;
}

// Looks up the internal userId for a given API key
export async function getUserId(apiKey: string): Promise<string | null> {
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
  const mapping = await UserMap.findOne({ apiKey: hashedKey });
  return mapping?.userId ?? null;
}
