import { Response } from 'express';
import { ErrorObject } from '../types';

const ERROR_STATUS_MAP: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INVALID_USER_ID: 400,
  INVALID_ORDER_ID: 400,
  INVALID_RECURRING_ORDER_ID: 400,
  INVALID_POSITION: 400,
  NO_PENDING_INSTANCES: 400,
  CONFLICT: 409,
  INVALID_LIMIT: 400,
  INVALID_OFFSET: 400,
  INVALID_ISSUE_DATE: 400,
  INVALID_CREATED_AT: 400,
  INVALID_DOCUMENT_CURRENCY_CODE: 400,
  INVALID_PAYABLE_AMOUNT: 400,
  INVALID_STORE_BODY: 400,
  INTERNAL_SERVER_ERROR: 500,
};

export function handleError(res: Response, error: ErrorObject): void {
  res.status(ERROR_STATUS_MAP[error.error] ?? 500).json(error);
}
