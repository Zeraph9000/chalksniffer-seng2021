import { Response } from 'express';
import { ErrorObject } from '../types';

const ERROR_STATUS_MAP: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INVALID_USER_ID: 400,
  INVALID_ORDER_ID: 400,
  INVALID_LIMIT: 400,
  INVALID_OFFSET: 400,
  INTERNAL_SERVER_ERROR: 500,
};

export function handleError(res: Response, error: ErrorObject): void {
  res.status(ERROR_STATUS_MAP[error.error] ?? 500).json(error);
}
