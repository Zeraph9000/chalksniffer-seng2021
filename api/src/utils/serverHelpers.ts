import { Request } from 'express';
import { apiKeyValidation, getUserId } from '../auth/auth';
import { ErrorObject } from '../types';

export function getApiKeyFromAuthorizationHeader(req: Request): string | null {
  const header = req.header('Authorization');
  if (!header) return null;

  // Accept either: "Bearer <apiKey>" or "<apiKey>"
  const match = header.match(/^Bearer\s+(.+)$/i);
  return (match?.[1] ?? header).trim() || null;
}

// Validates the API key and returns an ErrorObject or userId
export async function getUserIdFromApiKey(req: Request): Promise<{ userId: string } | ErrorObject> {
  const apiKey = getApiKeyFromAuthorizationHeader(req) as string;
  if (!apiKey || !await apiKeyValidation(apiKey)) return { error: 'UNAUTHORIZED', message: 'Invalid API key' };

  const userId = await getUserId(apiKey);
  if (userId == null) return { error: 'FORBIDDEN', message: 'No user mapped to given API key' };
  return { userId };
}
