import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import { getProduct, reserveVariantStock, restoreVariantStock } from "@/lib/product-service";
import { createMapping, setMappingField, isOrderServiceError } from "@/lib/order-service";
import { chalksniffer } from "@/lib/chalksniffer-client";
import { stripePlaceholder } from "@/lib/stripe-placeholder";
import { generateGuestToken } from "@/lib/guest-token";
import { buildUblOrder } from "@/lib/ubl-builder";
import { Product, Store, User, UserAddress } from "@/lib/types";
import { Filter, ObjectId } from "mongodb";

type CheckoutBody = {
  items: { productId: string; variantId: string; qty: number; unitPriceSnapshot: number }[];
  buyer: { name: string; email: string; phone: string; address: UserAddress; companyName?: string; abn?: string };
  note?: string;
  asGuest?: boolean;
};

export async function POST(request: NextRequest) {
  const session = await getSessionOrNull();
  const body = (await request.json()) as CheckoutBody;

  if (!body.items || body.items.length === 0) {
    return NextResponse.json({ error: "EMPTY_CART", message: "cart is empty" }, { status: 400 });
  }
  if (!body.buyer?.email || !body.buyer?.name || !body.buyer?.phone || !body.buyer?.address) {
    return NextResponse.json({ error: "MISSING_BUYER_INFO", message: "buyer info required" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db();

  // Resolve products + enforce single-store rule
  const products: Product[] = [];
  for (const it of body.items) {
    const p = await getProduct(db, it.productId);
    if (!p) return NextResponse.json({ error: "PRODUCT_NOT_FOUND", message: it.productId }, { status: 400 });
    products.push(p);
  }
  const storeIds = new Set(products.map(p => p.storeId));
  if (storeIds.size !== 1) {
    return NextResponse.json({ error: "CART_MULTI_STORE", message: "cart contains items from multiple stores" }, { status: 400 });
  }
  const storeId = products[0].storeId;
  const store = await db.collection<Store>("stores").findOne({ storeId });
  if (!store) return NextResponse.json({ error: "STORE_NOT_FOUND", message: "store missing" }, { status: 400 });
  if (store.status !== "active") {
    return NextResponse.json({ error: "STORE_NOT_ACTIVE", message: `store is ${store.status}` }, { status: 400 });
  }

  // Seller's user doc. store.userId is a string representation of the seller's ObjectId.
  let sellerObjectId: ObjectId;
  try {
    sellerObjectId = new ObjectId(store.userId);
  } catch {
    return NextResponse.json({ error: "SELLER_NOT_FOUND", message: "invalid seller reference" }, { status: 500 });
  }
  const seller = await db.collection<User>("users").findOne({ _id: sellerObjectId } as unknown as Filter<User>);
  if (!seller) return NextResponse.json({ error: "SELLER_NOT_FOUND", message: "seller missing" }, { status: 500 });

  // Reserve stock atomically; if any reservation fails, roll back previously-reserved items.
  const reserved: { productId: string; variantId: string; qty: number }[] = [];
  for (let i = 0; i < body.items.length; i++) {
    const it = body.items[i];
    const ok = await reserveVariantStock(db, it.productId, it.variantId, it.qty);
    if (!ok) {
      for (const r of reserved) await restoreVariantStock(db, r.productId, r.variantId, r.qty);
      return NextResponse.json({ error: "OUT_OF_STOCK", message: `${products[i].name} out of stock` }, { status: 409 });
    }
    reserved.push({ productId: it.productId, variantId: it.variantId, qty: it.qty });
  }

  // Build UBL payload + call Chalksniffer
  const ubl = buildUblOrder({
    store,
    sellerInfo: { companyName: seller.companyName ?? store.storeName, abn: seller.abn ?? "", address: seller.address },
    buyer: {
      name: body.buyer.name, email: body.buyer.email, phone: body.buyer.phone,
      address: body.buyer.address,
      companyName: body.buyer.companyName ?? null, abn: body.buyer.abn ?? null,
    },
    items: body.items.map((it, i) => ({
      product: products[i], variantId: it.variantId, qty: it.qty, unitPriceSnapshot: it.unitPriceSnapshot,
    })),
    note: body.note,
    issueDate: new Date().toISOString().split("T")[0],
  });

  const csRes = await chalksniffer.createOrder(ubl as unknown as Record<string, unknown>);
  if (!csRes.ok) {
    for (const r of reserved) await restoreVariantStock(db, r.productId, r.variantId, r.qty);
    return NextResponse.json({ error: "CHALKSNIFFER_FAILED", message: "order service unavailable" }, { status: 503 });
  }

  const orderId = (csRes.data as { id: string }).id;
  const payable = body.items.reduce((s, it) => s + it.qty * it.unitPriceSnapshot, 0);
  const guestToken = (!session || body.asGuest) ? generateGuestToken() : undefined;

  // Determine if session user is a seller — sellers can also buy as themselves.
  // Per the auth matrix, authed buyers go in as buyerId; guests are null.
  const buyerId = (!session || body.asGuest) ? null : session.userId;

  const mappingResult = await createMapping(db, {
    orderId, storeId, sellerId: store.userId,
    buyerId,
    buyerEmail: body.buyer.email, buyerName: body.buyer.name, buyerPhone: body.buyer.phone,
    buyerAddress: body.buyer.address,
    note: body.note,
    payableAmount: payable, documentCurrencyCode: products[0].currency, issueDate: ubl.issueDate,
    guestAccessToken: guestToken,
  });
  if (isOrderServiceError(mappingResult)) {
    for (const r of reserved) await restoreVariantStock(db, r.productId, r.variantId, r.qty);
    return NextResponse.json({ error: mappingResult.error, message: mappingResult.message }, { status: mappingResult.status });
  }

  // Create Stripe placeholder intent + store on mapping
  const intent = stripePlaceholder.createPaymentIntent(payable, products[0].currency);
  await setMappingField(db, orderId, { stripePaymentIntentId: intent.id });

  return NextResponse.json({
    orderId,
    paymentIntentId: intent.id,
    clientSecret: intent.clientSecret,
    total: payable,
    currency: products[0].currency,
    guestAccessToken: guestToken,
    statusUrl: guestToken ? `/orders/${orderId}?t=${guestToken}` : `/orders/${orderId}`,
  }, { status: 201 });
}
