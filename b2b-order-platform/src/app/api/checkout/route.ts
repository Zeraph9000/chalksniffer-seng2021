import { NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import clientPromise from "@/lib/db";
import { chalksniffer } from "@/lib/api-clients";
import { setMapping } from "@/lib/order-access";
import { Product, User } from "@/lib/types";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "buyer") return NextResponse.json({ error: "Buyers only" }, { status: 403 });

  const body = await request.json();
  const { buyerDetails, deliveryAddress, deliveryDate, note, items } = body as {
    buyerDetails: { companyName?: string; partyName?: string; abn: string; address: { streetName: string; cityName: string; postalZone: string; country: string }; email?: string; name?: string };
    deliveryAddress: { streetName: string; cityName: string; postalZone: string; country: string };
    deliveryDate: string;
    note?: string;
    items: { productId: string; quantity: number }[];
  };

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db();

  const productIds = items.map((i) => new ObjectId(i.productId));
  const products = await db.collection("products").find({ _id: { $in: productIds } }).toArray();
  const productMap = new Map(products.map((p) => [p._id!.toString(), p as unknown as Product]));

  const stockErrors: string[] = [];
  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) { stockErrors.push(`Product ${item.productId} not found`); continue; }
    if (product.stock < item.quantity) {
      stockErrors.push(`${product.name}: requested ${item.quantity}, only ${product.stock} available`);
    }
  }
  if (stockErrors.length > 0) {
    return NextResponse.json({ error: "Insufficient stock", details: stockErrors }, { status: 400 });
  }

  const sellerGroups = new Map<string, { product: Product; quantity: number }[]>();
  for (const item of items) {
    const product = productMap.get(item.productId)!;
    const group = sellerGroups.get(product.sellerEmail) || [];
    group.push({ product, quantity: item.quantity });
    sellerGroups.set(product.sellerEmail, group);
  }

  const sellerEmails = Array.from(sellerGroups.keys());
  const sellers = await db.collection<User>("users").find({ email: { $in: sellerEmails } }).toArray();
  const sellerProfileMap = new Map(sellers.map((s) => [s.email, s]));

  const createdOrders: string[] = [];

  for (const [sellerEmail, groupItems] of Array.from(sellerGroups.entries())) {
    const seller = sellerProfileMap.get(sellerEmail);
    if (!seller) continue;

    const orderBody = {
      issueDate: new Date().toISOString().split("T")[0],
      documentCurrencyCode: groupItems[0].product.currency || "AUD",
      note: note || undefined,
      buyerCustomerParty: {
        party: {
          partyName: buyerDetails.companyName || buyerDetails.partyName || "",
          partyIdentification: buyerDetails.abn,
          postalAddress: buyerDetails.address,
        },
      },
      sellerSupplierParty: {
        party: {
          partyName: seller.companyName,
          partyIdentification: seller.abn,
          postalAddress: seller.address,
        },
      },
      delivery: {
        deliveryAddress: deliveryAddress,
        requestedDeliveryPeriod: { startDate: deliveryDate, endDate: deliveryDate },
      },
      orderLines: groupItems.map((gi: { product: Product; quantity: number }, index: number) => ({
        lineItem: {
          id: String(index + 1),
          quantity: gi.quantity,
          unitCode: gi.product.unitCode,
          price: { priceAmount: gi.product.unitPrice, currencyID: gi.product.currency || "AUD" },
          item: { name: gi.product.name, description: gi.product.description || undefined },
        },
      })),
    };

    const res = await chalksniffer().post("/orders", orderBody);
    const data = await res.json();
    console.log("Checkout order response:", res.status, data.id || "NO ID", JSON.stringify(data).slice(0, 200));

    if (res.ok && data.id) {
      await setMapping(data.id, {
        orderId: data.id,
        buyerId: session.userId,
        sellerId: seller._id!.toString(),
        buyerStatus: "under_review",
        sellerStatus: "needs_review",
      });
      createdOrders.push(data.id);

      for (const gi of groupItems) {
        await db.collection("products").updateOne(
          { _id: new ObjectId(gi.product._id!) },
          { $inc: { stock: -gi.quantity } }
        );
      }
    }
  }

  return NextResponse.json({ orders: createdOrders });
}
