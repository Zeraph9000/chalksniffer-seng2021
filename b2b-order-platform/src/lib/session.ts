import { getBuyerSessionOrNull } from "./buyer-session";
import { getSellerSessionOrNull } from "./seller-session";
import { SessionData } from "./types";

/**
 * Returns whichever session cookie is present — seller first, then buyer.
 * Prefer `getBuyerSessionOrNull` or `getSellerSessionOrNull` directly when
 * you know which role you expect. This helper exists for endpoints that
 * intentionally accept either role (e.g., cross-role account pages).
 */
export async function getSessionOrNull(): Promise<SessionData | null> {
  const seller = await getSellerSessionOrNull();
  if (seller) return seller;
  return getBuyerSessionOrNull();
}
