import { Db } from "mongodb";
import { getBuyerSessionOrNull } from "./buyer-session";
import { getSellerSessionOrNull } from "./seller-session";
import { OrderMapping } from "./types";

export type OrderAuth =
  | { role: "buyer"; userId: string; mapping: OrderMapping }
  | { role: "seller"; userId: string; mapping: OrderMapping }
  | { role: "guest"; mapping: OrderMapping }
  | { error: "NOT_FOUND" | "FORBIDDEN"; status: number };

/**
 * Priority:
 *   1. Valid guest token → guest
 *   2. Buyer cookie matching mapping.buyerId → buyer
 *   3. Seller cookie matching mapping.sellerId → seller
 *   4. NOT_FOUND (no existence leak)
 */
export async function authorizeOrderAccess(
  db: Db, orderId: string, token: string | null
): Promise<OrderAuth> {
  const mapping = await db.collection<OrderMapping>("orderMappings").findOne({ orderId });
  if (!mapping) return { error: "NOT_FOUND", status: 404 };

  if (token && mapping.guestAccessToken && token === mapping.guestAccessToken) {
    return { role: "guest", mapping };
  }

  const buyerSession = await getBuyerSessionOrNull();
  if (buyerSession && mapping.buyerId && mapping.buyerId === buyerSession.userId) {
    return { role: "buyer", userId: buyerSession.userId, mapping };
  }

  const sellerSession = await getSellerSessionOrNull();
  if (sellerSession && mapping.sellerId === sellerSession.userId) {
    return { role: "seller", userId: sellerSession.userId, mapping };
  }

  return { error: "NOT_FOUND", status: 404 };
}
