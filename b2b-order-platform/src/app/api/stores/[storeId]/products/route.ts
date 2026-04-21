import { NextResponse } from "next/server";
import clientPromise from "@/lib/db";
import { listProductsForStore } from "@/lib/product-service";

export async function GET(_request: Request, { params }: { params: { storeId: string } }) {
  const client = await clientPromise;
  const products = await listProductsForStore(client.db(), params.storeId, false);
  return NextResponse.json(products);
}
