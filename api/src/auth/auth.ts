import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { UserMap } from '../models/userMap';
import crypto from 'crypto';

export const router = Router();

function getApiKeyFromAuthorizationHeader(req: Request): string | null {
  const header = req.header('Authorization');
  if (!header) return null;

  // Accept either: "Bearer <apiKey>" or "<apiKey>"
  const match = header.match(/^Bearer\s+(.+)$/i);
  return (match?.[1] ?? header).trim() || null;
}

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

export async function refreshUserApiKey(currentApiKey: string): Promise<string | null> {
  const isValid = await apiKeyValidation(currentApiKey);
  if (!isValid) return null;

  const currentHashedKey = crypto.createHash('sha256').update(currentApiKey).digest('hex');

  const mapping = await UserMap.findOne({ apiKey: currentHashedKey });
  if (!mapping) return null;

  const newApiKey = crypto.randomBytes(32).toString('hex');
  const newHashedKey = crypto.createHash('sha256').update(newApiKey).digest('hex');

  mapping.apiKey = newHashedKey;
  await mapping.save();

  return newApiKey;
}

// Looks up the internal userId for a given API key
export async function getUserId(apiKey: string): Promise<string | null> {
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
  const mapping = await UserMap.findOne({ apiKey: hashedKey });
  return mapping?.userId ?? null;
}

// Creates a new userId and maps a fresh apiKey -> userId.
router.post('/register', async (_req: Request, res: Response) => {
  try {
    const apiKey = await createUser();
    res.status(200).json({ apiKey });
  } catch {
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// Invalidates the current apiKey and returns a new one for the same userId.
router.post('/token/refresh', async (req: Request, res: Response) => {
  const currentApiKey = getApiKeyFromAuthorizationHeader(req);
  if (!currentApiKey) {
    res.status(401).json({ error: 'Missing API key' });
    return;
  }

  try {
    const newApiKey = await refreshUserApiKey(currentApiKey);
    if (!newApiKey) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    res.status(200).json({ apiKey: newApiKey });
  } catch {
    res.status(500).json({ error: 'Failed to refresh API key' });
  }
});
