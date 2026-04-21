import { Db } from "mongodb";
import { getSessionOrNull } from "./session";
import { OrderMapping } from "./types";

export type OrderAuth =
  | { role: "buyer"; userId: string; mapping: OrderMapping }
  | { role: "seller"; userId: string; mapping: OrderMapping }
  | { role: "guest"; mapping: OrderMapping }
  | { error: "NOT_FOUND" | "FORBIDDEN"; status: number };

/**
 * Single source of truth for order-endpoint authorization.
 *
 * Priority:
 *   1. If a valid guest token is presented AND matches the mapping's stored token -> guest access
 *   2. Else if an authenticated session matches buyerId -> buyer access
 *   3. Else if an authenticated seller session matches sellerId -> seller access
 *   4. Else NOT_FOUND (do not leak existence)
 */
export async function authorizeOrderAccess(
  db: Db, orderId: string, token: string | null
): Promise<OrderAuth> {
  const mapping = await db.collection<OrderMapping>("orderMappings").findOne({ orderId });
  if (!mapping) return { error: "NOT_FOUND", status: 404 };

  if (token && mapping.guestAccessToken && token === mapping.guestAccessToken) {
    return { role: "guest", mapping };
  }
  const session = await getSessionOrNull();
  if (session) {
    if (mapping.buyerId && mapping.buyerId === session.userId) {
      return { role: "buyer", userId: session.userId, mapping };
    }
    if (session.role === "seller" && mapping.sellerId === session.userId) {
      return { role: "seller", userId: session.userId, mapping };
    }
  }
  return { error: "NOT_FOUND", status: 404 };
}
