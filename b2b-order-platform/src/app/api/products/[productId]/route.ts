import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { getSessionOrNull } from "@/lib/session";
import {
  getProduct,
  updateProduct,
  softDeleteProduct,
  isProductServiceError,
} from "@/lib/product-service";

export async function GET(_request: NextRequest, { params }: { params: { productId: string } }) {
  const client = await clientPromise;
  const product = await getProduct(client.db(), params.productId);
  if (!product)
    return NextResponse.json({ error: "NOT_FOUND", message: "product does not exist" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PUT(request: NextRequest, { params }: { params: { productId: string } }) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "seller") return NextResponse.json({ error: "Sellers only" }, { status: 403 });

  const client = await clientPromise;
  const result = await updateProduct(
    client.db(),
    session.userId,
    params.productId,
    await request.json()
  );
  if (isProductServiceError(result)) {
    return NextResponse.json({ error: result.error, message: result.message }, { status: result.status });
  }
  return NextResponse.json(result);
}

export async function DELETE(_request: NextRequest, { params }: { params: { productId: string } }) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "seller") return NextResponse.json({ error: "Sellers only" }, { status: 403 });

  const client = await clientPromise;
  const result = await softDeleteProduct(client.db(), session.userId, params.productId);
  if (isProductServiceError(result)) {
    return NextResponse.json({ error: result.error, message: result.message }, { status: result.status });
  }
  return NextResponse.json(result);
}
