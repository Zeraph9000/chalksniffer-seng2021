import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { ApiKey } from '../../models/apiKey';
import { User } from '../../models/user';

const router = Router();

// Generate a unique API key.
function generateApiKey(): string {
  return crypto.randomUUID();
}

// Generate a unique user id.
function generateUserId(): string {
  return crypto.randomUUID();
}

function getApiKeyFromAuthorizationHeader(req: Request): string | null {
  const header = req.header('Authorization');
  if (!header) return null;

  // Accept either: "Bearer <apiKey>" or "<apiKey>"
  const match = header.match(/^Bearer\s+(.+)$/i);
  return (match?.[1] ?? header).trim() || null;
}

// POST /auth/register
// Creates a new userId and maps a fresh apiKey -> userId.
router.post('/register', async (req: Request, res: Response) => {
  try {
    const apiKey = generateApiKey();
    const userId = generateUserId();

    await User.create({ userId });
    await ApiKey.create({ apiKey, userId });

    res.status(200).json({ apiKey });
  } catch (err) {
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
    const existing = await ApiKey.findOne({ apiKey: currentApiKey }).lean();
    if (!existing) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    const userExists = await User.exists({ userId: existing.userId });
    if (!userExists) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    const newApiKey = generateApiKey();

    await ApiKey.deleteOne({ apiKey: currentApiKey });
    await ApiKey.create({ apiKey: newApiKey, userId: existing.userId });

    res.status(200).json({ apiKey: newApiKey });
  } catch (err) {
    res.status(500).json({ error: 'Failed to refresh API key' });
  }
});

export const authRouter = router;
