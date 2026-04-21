import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import { isStoreServiceError, updateStoreStatus } from "@/lib/store-service";

type StoreStatusRouteContext = {
  params: {
    storeId: string;
  };
};

export async function PUT(request: NextRequest, { params }: StoreStatusRouteContext) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "seller") return NextResponse.json({ error: "Sellers only" }, { status: 403 });

  const client = await clientPromise;
  const db = client.db();
  const body = await request.json();
  const result = await updateStoreStatus(db, session.userId, params.storeId, body.status);

  if (isStoreServiceError(result)) {
    return NextResponse.json({ error: result.error, message: result.message }, { status: result.status });
  }

  return NextResponse.json(result);
}
