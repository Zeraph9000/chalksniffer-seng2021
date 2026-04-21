/* eslint-disable no-console */
import crypto from "crypto";
import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcrypt";

const URI = process.env.MONGODB_URI || "mongodb://localhost:27017/chalksniffer-b2b";

async function main() {
  const client = await MongoClient.connect(URI);
  const db = client.db();

  await db.collection("users").deleteMany({});
  await db.collection("stores").deleteMany({});
  await db.collection("products").deleteMany({});
  await db.collection("orderMappings").deleteMany({});

  const hash = await bcrypt.hash("password123", 10);

  const seller = {
    _id: new ObjectId(),
    name: "Andrew Baker",
    email: "andrew@acmebakery.com",
    password: hash,
    role: "seller" as const,
    companyName: "Acme Bakery Pty Ltd",
    abn: "12345678910",
    phone: "0412345678",
    address: { streetName: "48 Mount St", cityName: "Sydney", postalZone: "2036", country: "AU" },
    createdAt: new Date(),
  };
  const buyer = {
    _id: new ObjectId(),
    name: "Alice Buyer",
    email: "alice@example.com",
    password: hash,
    role: "buyer" as const,
    phone: "0498765432",
    address: { streetName: "1 Kensington Rd", cityName: "Sydney", postalZone: "2032", country: "AU" },
    createdAt: new Date(),
  };
  await db.collection("users").insertMany([seller, buyer]);

  const storeId = crypto.randomUUID();
  await db.collection("stores").insertOne({
    storeId,
    userId: seller._id.toString(),
    slug: "acme-bakery",
    storeName: "Acme Bakery",
    description: "Freshly baked goods daily",
    logoUrl: "https://placehold.co/200x200",
    bannerUrl: "https://placehold.co/1200x300",
    location: "Sydney",
    category: "bakery",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Simple product (no options, one default variant)
  const loafId = crypto.randomUUID();
  await db.collection("products").insertOne({
    productId: loafId,
    storeId,
    name: "Sourdough Loaf",
    description: "24-hour fermented sourdough",
    category: "bread",
    imageUrl: "https://placehold.co/400x400",
    unitCode: "each",
    currency: "AUD",
    available: true,
    options: [],
    variants: [{ variantId: crypto.randomUUID(), optionValues: {}, price: 9.0, stock: 30 }],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Multi-variant product (two options, six variants)
  const cakeId = crypto.randomUUID();
  await db.collection("products").insertOne({
    productId: cakeId,
    storeId,
    name: "Chocolate Cake",
    description: "Moist, dense, layered chocolate cake",
    category: "cake",
    imageUrl: "https://placehold.co/400x400",
    unitCode: "each",
    currency: "AUD",
    available: true,
    options: [
      { name: "Size", values: ["Small", "Medium", "Large"] },
      { name: "Frosting", values: ["Buttercream", "Ganache"] },
    ],
    variants: [
      { variantId: crypto.randomUUID(), optionValues: { Size: "Small", Frosting: "Buttercream" }, price: 25, stock: 5 },
      { variantId: crypto.randomUUID(), optionValues: { Size: "Small", Frosting: "Ganache" }, price: 28, stock: 5 },
      { variantId: crypto.randomUUID(), optionValues: { Size: "Medium", Frosting: "Buttercream" }, price: 35, stock: 3 },
      { variantId: crypto.randomUUID(), optionValues: { Size: "Medium", Frosting: "Ganache" }, price: 38, stock: 3 },
      { variantId: crypto.randomUUID(), optionValues: { Size: "Large", Frosting: "Buttercream" }, price: 55, stock: 2 },
      { variantId: crypto.randomUUID(), optionValues: { Size: "Large", Frosting: "Ganache" }, price: 58, stock: 0 },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log("Seeded:");
  console.log(`  seller: ${seller.email} / password123`);
  console.log(`  buyer:  ${buyer.email}  / password123`);
  console.log(`  store:  /store/acme-bakery`);

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
