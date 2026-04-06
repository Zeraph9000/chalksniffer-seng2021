import { NextRequest, NextResponse } from "next/server";
import { getSessionOrNull } from "@/lib/session";
import clientPromise from "@/lib/db";
import { Product } from "@/lib/types";

export async function GET(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db();
  const { searchParams } = request.nextUrl;

  const filter: Record<string, unknown> = {};
  const search = searchParams.get("search");
  const category = searchParams.get("category");
  const seller = searchParams.get("seller");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
    ];
  }
  if (category) filter.category = category;
  if (seller) filter.sellerEmail = seller;
  if (minPrice || maxPrice) {
    filter.unitPrice = {};
    if (minPrice) (filter.unitPrice as Record<string, number>).$gte = Number(minPrice);
    if (maxPrice) (filter.unitPrice as Record<string, number>).$lte = Number(maxPrice);
  }

  if (session.role === "seller" && !seller) {
    filter.sellerEmail = session.email;
  }

  const products = await db
    .collection<Product>("products")
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  const sellerEmails = Array.from(new Set(products.map((p) => p.sellerEmail)));
  const sellers = await db
    .collection("users")
    .find({ email: { $in: sellerEmails } }, { projection: { email: 1, companyName: 1, _id: 0 } })
    .toArray();
  const sellerMap = Object.fromEntries(sellers.map((s) => [s.email, s.companyName]));

  const enriched = products.map((p) => ({
    ...p,
    sellerCompanyName: sellerMap[p.sellerEmail] || p.sellerEmail,
  }));

  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const session = await getSessionOrNull();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "seller") return NextResponse.json({ error: "Sellers only" }, { status: 403 });

  const body = await request.json();
  const { name, description, category, unitCode, unitPrice, currency, stock } = body;

  if (!name || !category || !unitCode || unitPrice == null || stock == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db();

  const product = {
    sellerEmail: session.email,
    name,
    description: description || "",
    category,
    unitCode,
    unitPrice: Number(unitPrice),
    currency: currency || "AUD",
    stock: Number(stock),
    createdAt: new Date(),
  };

  const result = await db.collection("products").insertOne(product);
  return NextResponse.json({ ...product, _id: result.insertedId });
}
