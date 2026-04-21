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
    logoUrl: "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=400&h=400&fit=crop",
    bannerUrl: "https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=1600&h=500&fit=crop",
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
    imageUrls: ["https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=800&h=800&fit=crop"],
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
    imageUrls: [
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1464195244916-405fa0a82545?w=800&h=800&fit=crop",
    ],
    unitCode: "each",
    currency: "AUD",
    available: true,
    options: [
      { name: "Size", values: ["Small", "Medium", "Large"] },
      { name: "Frosting", values: ["Buttercream", "Ganache"] },
    ],
    variants: [
      { variantId: crypto.randomUUID(), optionValues: { Size: "Small", Frosting: "Buttercream" }, price: 25, stock: 5, imageUrl: "https://images.unsplash.com/photo-1464195244916-405fa0a82545?w=800&h=800&fit=crop" },
      { variantId: crypto.randomUUID(), optionValues: { Size: "Small", Frosting: "Ganache" }, price: 28, stock: 5, imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=800&fit=crop" },
      { variantId: crypto.randomUUID(), optionValues: { Size: "Medium", Frosting: "Buttercream" }, price: 35, stock: 3, imageUrl: "https://images.unsplash.com/photo-1464195244916-405fa0a82545?w=800&h=800&fit=crop" },
      { variantId: crypto.randomUUID(), optionValues: { Size: "Medium", Frosting: "Ganache" }, price: 38, stock: 3, imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=800&fit=crop" },
      { variantId: crypto.randomUUID(), optionValues: { Size: "Large", Frosting: "Buttercream" }, price: 45, compareAtPrice: 55, stock: 2, imageUrl: "https://images.unsplash.com/photo-1464195244916-405fa0a82545?w=800&h=800&fit=crop" },
      { variantId: crypto.randomUUID(), optionValues: { Size: "Large", Frosting: "Ganache" }, price: 48, compareAtPrice: 58, stock: 0, imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&h=800&fit=crop" },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Single-option product (one option, four variants)
  const bagelId = crypto.randomUUID();
  await db.collection("products").insertOne({
    productId: bagelId,
    storeId,
    name: "Bagel",
    description: "Boiled then baked, chewy and dense",
    category: "bread",
    imageUrls: ["https://images.unsplash.com/photo-1623334044303-241021148842?w=800&h=800&fit=crop"],
    unitCode: "each",
    currency: "AUD",
    available: true,
    options: [{ name: "Flavor", values: ["Plain", "Sesame", "Everything", "Poppy"] }],
    variants: [
      { variantId: crypto.randomUUID(), optionValues: { Flavor: "Plain" }, price: 4.5, stock: 40 },
      { variantId: crypto.randomUUID(), optionValues: { Flavor: "Sesame" }, price: 5.0, stock: 30 },
      { variantId: crypto.randomUUID(), optionValues: { Flavor: "Everything" }, price: 5.5, stock: 25 },
      { variantId: crypto.randomUUID(), optionValues: { Flavor: "Poppy" }, price: 5.0, stock: 0 },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Two-option product with six variants, stock shape differs from cake
  const croissantId = crypto.randomUUID();
  await db.collection("products").insertOne({
    productId: croissantId,
    storeId,
    name: "Croissant",
    description: "Laminated butter pastry, baked fresh every morning",
    category: "pastry",
    imageUrls: ["https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&h=800&fit=crop"],
    unitCode: "each",
    currency: "AUD",
    available: true,
    options: [
      { name: "Filling", values: ["Plain", "Almond", "Chocolate"] },
      { name: "Size", values: ["Regular", "Jumbo"] },
    ],
    variants: [
      { variantId: crypto.randomUUID(), optionValues: { Filling: "Plain", Size: "Regular" }, price: 4.5, stock: 50 },
      { variantId: crypto.randomUUID(), optionValues: { Filling: "Plain", Size: "Jumbo" }, price: 7.0, stock: 15 },
      { variantId: crypto.randomUUID(), optionValues: { Filling: "Almond", Size: "Regular" }, price: 6.0, stock: 20 },
      { variantId: crypto.randomUUID(), optionValues: { Filling: "Almond", Size: "Jumbo" }, price: 9.0, stock: 8 },
      { variantId: crypto.randomUUID(), optionValues: { Filling: "Chocolate", Size: "Regular" }, price: 6.0, stock: 25 },
      { variantId: crypto.randomUUID(), optionValues: { Filling: "Chocolate", Size: "Jumbo" }, price: 9.0, stock: 0 },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Pack-size product (one option, three variants)
  const brownieId = crypto.randomUUID();
  await db.collection("products").insertOne({
    productId: brownieId,
    storeId,
    name: "Fudge Brownies",
    description: "Rich double-chocolate brownies with a crackly top",
    category: "pastry",
    imageUrls: ["https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&h=800&fit=crop"],
    unitCode: "each",
    currency: "AUD",
    available: true,
    options: [{ name: "Pack", values: ["Individual", "6-pack", "12-pack"] }],
    variants: [
      { variantId: crypto.randomUUID(), optionValues: { Pack: "Individual" }, price: 5.0, stock: 60 },
      { variantId: crypto.randomUUID(), optionValues: { Pack: "6-pack" }, price: 26.0, stock: 20 },
      { variantId: crypto.randomUUID(), optionValues: { Pack: "12-pack" }, price: 42.0, compareAtPrice: 48.0, stock: 10 },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log("Seeded:");
  console.log(`  seller:   ${seller.email} / password123`);
  console.log(`  buyer:    ${buyer.email}  / password123`);
  console.log(`  store:    /store/acme-bakery`);
  console.log(`  products: 5 (Sourdough Loaf, Chocolate Cake, Bagel, Croissant, Fudge Brownies)`);

  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
