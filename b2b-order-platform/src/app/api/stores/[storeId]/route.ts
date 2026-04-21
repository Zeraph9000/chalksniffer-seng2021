import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import { isStoreServiceError, updateStore } from "@/lib/store-service";
import { Store } from "@/lib/types";

type StoreRouteContext = {
  params: {
    storeId: string;
  };
};

export async function GET(_request: NextRequest, { params }: StoreRouteContext) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db();
  const store = await db.collection<Store>("stores").findOne({ storeId: params.storeId });

  if (!store) {
    return NextResponse.json({ error: "Not Found", message: "Store does not exist" }, { status: 404 });
  }

  return NextResponse.json(store);
}

export async function PUT(request: NextRequest, { params }: StoreRouteContext) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "seller") return NextResponse.json({ error: "Sellers only" }, { status: 403 });

  const client = await clientPromise;
  const db = client.db();
  const result = await updateStore(db, session.userId, params.storeId, await request.json());

  if (isStoreServiceError(result)) {
    return NextResponse.json({ error: result.error, message: result.message }, { status: result.status });
  }

  return NextResponse.json(result);
}
