import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import { createProduct, isProductServiceError } from "@/lib/product-service";

export async function POST(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "seller") return NextResponse.json({ error: "Sellers only" }, { status: 403 });

  const client = await clientPromise;
  const result = await createProduct(client.db(), session.userId, await request.json());
  if (isProductServiceError(result)) {
    return NextResponse.json({ error: result.error, message: result.message }, { status: result.status });
  }
  return NextResponse.json(result, { status: 201 });
}

export async function GET() {
  return NextResponse.json(
    { error: "USE_STORE_SCOPED", message: "Use /api/stores/[storeId]/products" },
    { status: 400 }
  );
}
